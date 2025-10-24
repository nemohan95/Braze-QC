import axios from "axios";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { fetchBrazePreviewHtml, isHostAllowed } from "@/lib/brazePreview";
import { EMAIL_TYPE_OPTIONS } from "@/lib/constants";
import type { CopyDocLink } from "@/lib/copyDoc";
import { normaliseCopyDocHtml, normaliseCopyDocLinks } from "@/lib/copyDoc";
import { extractCopyDocLinksFromHtml } from "@/lib/copyDocServer";
import { mergeEmailLinks, normaliseLinkArray } from "@/lib/emailLinks";
import { isQcModelMockEnabled, runQcModel } from "@/lib/gpt";
import { checkLinks } from "@/lib/linkCheck";
import { evaluateCopyDocLinkCoverage, evaluateLinkRules } from "@/lib/linkRules";
import { normaliseString } from "@/lib/normalise";
import { parseEmail } from "@/lib/parseEmail";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requestContext";
import { checkRateLimit } from "@/lib/rateLimit";
import { QcProgressStage, STAGE_SEQUENCE } from "@/lib/qcProgress";

export const runtime = "nodejs";

const EMAIL_TYPE_SET = new Set<string>(EMAIL_TYPE_OPTIONS);

function serialiseUnknown(value: unknown): string {
  if (value === null || value === undefined) {
    return "unknown error";
  }
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Error) {
    return value.message || value.name || "Error";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function describeRunError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const code = error.code;
    const url = error.config?.url;
    const base = error.message || "Request to upstream service failed";
    const statusPart = status ? ` (status ${status})` : "";
    const codePart = code ? ` [${code}]` : "";
    const urlPart = url ? ` while fetching ${url}` : "";
    return `${base}${statusPart}${codePart}${urlPart}`.trim();
  }
  return serialiseUnknown(error);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildFallbackPreviewHtml(copyDocText: string, copyDocHtml?: string | null): string {
  const html = copyDocHtml?.trim();
  if (html) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fallback preview</title></head><body>${html}</body></html>`;
  }

  const paragraphs = copyDocText
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => `<p>${escapeHtml(segment)}</p>`);

  const body = paragraphs.length > 0 ? paragraphs.join("\n") : "<p>(No preview content available)</p>";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fallback preview</title></head><body>${body}</body></html>`;
}

async function updateRunStatus(runId: string, stage: QcProgressStage) {
  await prisma.qcRun.update({ where: { id: runId }, data: { status: stage } });
}

async function processQcRun({
  runId,
  targetUrl,
  copyDocText,
  copyDocHtml,
  copyDocLinks,
  emailPreviewLinks,
  silo,
  entity,
  emailType,
  mockModel,
}: {
  runId: string;
  targetUrl: URL;
  copyDocText: string;
  copyDocHtml: string | null;
  copyDocLinks: CopyDocLink[];
  emailPreviewLinks: string[];
  silo: string;
  entity: string;
  emailType: string;
  mockModel: boolean;
}) {
  const stage = async (value: QcProgressStage) => updateRunStatus(runId, value);

  const additionalChecks: Array<{
    type: string;
    name: string;
    pass: boolean;
    details?: unknown;
  }> = [];

  try {
    await stage("fetching_preview");

    let html: string | null = null;

    try {
      html = await fetchBrazePreviewHtml(targetUrl);
    } catch (error) {
      html = buildFallbackPreviewHtml(copyDocText, copyDocHtml);
      additionalChecks.push({
        type: mockModel ? "system_notice" : "fetch_failure",
        name: mockModel ? "Preview fallback" : "Preview fetch failed",
        pass: false,
        details: mockModel
          ? "Braze preview could not be fetched. Generated fallback HTML from the copy document instead."
          : `Failed to load Braze preview: ${(error as Error).message}`,
      });
    }

    await stage("parsing_preview");
    const parsedEmail = parseEmail(html);
    const resolvedEmailLinks = mergeEmailLinks(parsedEmail.links, emailPreviewLinks);

    await stage("loading_rules");
    const [riskRules, disclaimerRules, keywordRules, additionalRules, linkRules] = await Promise.all([
      prisma.riskRule.findMany({
        where: {
          entity,
          active: true,
          OR: [{ siloFilter: null }, { siloFilter: "" }, { siloFilter: silo }],
        },
        orderBy: { text: "asc" },
      }),
      prisma.disclaimerRule.findMany({
        where: {
          entity,
          active: true,
          OR: [{ silo: null }, { silo: "" }, { silo }],
          emailType,
        },
        orderBy: [{ silo: "asc" }, { kind: "asc" }],
      }),
      prisma.keywordRule.findMany({ where: { active: true }, orderBy: { keyword: "asc" } }),
      prisma.additionalRule.findMany({
        where: { entity, silo, active: true },
        orderBy: { topic: "asc" },
      }),
      prisma.linkRule.findMany({
        where: {
          entity,
          active: true,
          emailType,
          OR: [{ silo: null }, { silo: "" }, { silo }],
        },
        orderBy: [{ kind: "asc" }, { hrefPattern: "asc" }],
      }),
    ]);

    await stage("running_model");
    const modelResult = await runQcModel({
      silo,
      entity,
      emailType,
      riskRules: riskRules.map((rule) => rule.text),
      disclaimerRules: disclaimerRules.map((rule) => rule.text),
      keywordRules: keywordRules.map((rule) => ({
        keyword: rule.keyword,
        requiredText: rule.requiredText,
      })),
      additionalRules: additionalRules.map((rule) => ({
        topic: rule.topic,
        silo: rule.silo,
        entity: rule.entity,
        text: rule.text,
        links: rule.links ?? undefined,
        notes: rule.notes ?? undefined,
        version: rule.version ?? undefined,
      })),
      brazePreviewUrl: targetUrl.toString(),
      emailContent: {
        subject: parsedEmail.subject,
        preheader: parsedEmail.preheader,
        bodyParagraphs: parsedEmail.bodyParagraphs,
        ctas: parsedEmail.ctas,
      },
      rawEmailHtml: html,
      copyDocText,
    });

    if (mockModel) {
      additionalChecks.push({
        type: "disclaimer",
        name: "Mock QC mode",
        pass: true,
        details: "QC model ran in mock mode; results are generated locally for development.",
      });
    }

    await stage("checking_links");
    const linkResults = mockModel
      ? resolvedEmailLinks.map((url) => ({
          url,
          ok: true,
          notes: "link_check_skipped_mock_mode",
        }))
      : await checkLinks(resolvedEmailLinks);

    if (linkRules.length > 0) {
      const requirementResult = evaluateLinkRules({ rules: linkRules, emailLinks: resolvedEmailLinks });
      additionalChecks.push({
        type: "link_requirement",
        name: "Link requirements",
        pass: requirementResult.missing.length === 0,
        details: {
          evaluated: linkRules.length,
          matched: requirementResult.matched,
          missing: requirementResult.missing,
        },
      });
    }

    if (copyDocLinks.length > 0) {
      const coverageResult = evaluateCopyDocLinkCoverage({
        copyDocLinks,
        emailLinks: resolvedEmailLinks,
      });
      additionalChecks.push({
        type: "link_requirement",
        name: "Copy doc link coverage",
        pass: coverageResult.missing.length === 0,
        details: {
          copyDocLinks: copyDocLinks.length,
          matched: coverageResult.matched,
          missing: coverageResult.missing,
        },
      });
    }

    await stage("saving_results");
    await prisma.qcRun.update({
      where: { id: runId },
      data: {
        status: "completed",
        summaryPass: modelResult.summary_pass,
        modelVersion: modelResult.model_version,
        finishedAt: new Date(),
        checks: {
          create: [
            ...modelResult.checks.map((check) => ({
              type: check.type,
              name: check.name,
              pass: check.pass,
              details: check.details ?? undefined,
            })),
            ...additionalChecks.map((check) => ({
              type: check.type,
              name: check.name,
              pass: check.pass,
              details: check.details ?? undefined,
            })),
          ],
        },
        links: {
          create: linkResults.map((link) => ({
            url: link.url,
            statusCode: link.statusCode ?? undefined,
            ok: link.ok ?? undefined,
            redirected: link.redirected ?? undefined,
            finalUrl: link.finalUrl ?? undefined,
            notes: link.notes ?? undefined,
          })),
        },
      },
    });
  } catch (error) {
    const description = describeRunError(error);
    console.error("Failed processing QC run", { runId, error: description });
    await prisma.qcRun.update({
      where: { id: runId },
      data: {
        status: "failed",
        finishedAt: new Date(),
        checks: {
          create: {
            type: "system_notice",
            name: "Run failed",
            pass: false,
            details: description,
          },
        },
      },
    });
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(ip);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 },
    );
  }

  let payload: {
    name?: unknown;
    brazeUrl?: unknown;
    copyDocText?: unknown;
    copyDocHtml?: unknown;
    copyDocLinks?: unknown;
    emailPreviewLinks?: unknown;
    silo?: unknown;
    entity?: unknown;
    emailType?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const name = normaliseString(payload.name) || null;
  const brazeUrl = normaliseString(payload.brazeUrl);
  const copyDocText = normaliseString(payload.copyDocText);
  const copyDocHtml = normaliseCopyDocHtml(payload.copyDocHtml);
  let copyDocLinks = normaliseCopyDocLinks(payload.copyDocLinks);
  const previewLinksProvided = Object.prototype.hasOwnProperty.call(payload, "emailPreviewLinks");
  const emailPreviewLinks = normaliseLinkArray(payload.emailPreviewLinks);
  const silo = normaliseString(payload.silo);
  const entity = normaliseString(payload.entity);
  const emailType = normaliseString(payload.emailType) ?? "marketing";

  if (copyDocLinks.length === 0 && copyDocHtml) {
    copyDocLinks = extractCopyDocLinksFromHtml(copyDocHtml);
  }

  if (!brazeUrl || !copyDocText || !silo || !entity) {
    return NextResponse.json(
      { error: "brazeUrl, copyDocText, silo, and entity are required" },
      { status: 400 },
    );
  }

  if (!previewLinksProvided) {
    return NextResponse.json(
      { error: "emailPreviewLinks must be provided. Fetch the Braze preview before submitting." },
      { status: 400 },
    );
  }

  if (!EMAIL_TYPE_SET.has(emailType)) {
    return NextResponse.json(
      { error: "emailType must be marketing or transactional" },
      { status: 400 },
    );
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(brazeUrl);
  } catch {
    return NextResponse.json({ error: "brazeUrl must be a valid URL" }, { status: 400 });
  }

  if (!isHostAllowed(targetUrl)) {
    return NextResponse.json({ error: "brazeUrl host is not permitted" }, { status: 400 });
  }

  const rawOpenAiKey = process.env.OPENAI_API_KEY?.trim();
  const mockModel = isQcModelMockEnabled();

  if (rawOpenAiKey) {
    process.env.OPENAI_API_KEY = rawOpenAiKey;
  }

  if (!rawOpenAiKey && !mockModel) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Add it to your environment or set QC_MODEL_MODE=mock for local development.",
        hint: "Set OPENAI_API_KEY and ensure the server process can read it, or opt into mock mode.",
        code: "OPENAI_CONFIG_MISSING",
      },
      { status: 500 },
    );
  }

  try {
    const run = await prisma.qcRun.create({
      data: {
        name,
        brazeUrl: targetUrl.toString(),
        copyDocText,
        copyDocHtml: copyDocHtml ?? undefined,
        copyDocLinks: copyDocLinks.length > 0 ? (copyDocLinks as Prisma.JsonValue) : undefined,
        silo,
        entity,
        emailType,
        status: STAGE_SEQUENCE[0],
      },
      select: { id: true },
    });

    void processQcRun({
      runId: run.id,
      targetUrl,
      copyDocText,
      copyDocHtml,
      copyDocLinks,
      emailPreviewLinks,
      silo,
      entity,
      emailType,
      mockModel,
    });

    return NextResponse.json({ id: run.id }, { status: 202 });
  } catch (error) {
    const message = (error as Error)?.message || "Failed to create QC run";
    const lower = message.toLowerCase();
    const status = 500;
    let code = "QC_RUN_FAILED";

    if (lower.includes("openai") || lower.includes("api key")) {
      code = "OPENAI_REQUEST_FAILED";
    } else if (lower.includes("prisma") || lower.includes("database")) {
      code = "DB_WRITE_FAILED";
    } else if (lower.includes("parse") && lower.includes("model")) {
      code = "MODEL_OUTPUT_PARSE_FAILED";
    }

    console.error("Failed to enqueue QC run", { code, message });
    return NextResponse.json({ error: message, code }, { status });
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || "1");
  const pageSize = Number(url.searchParams.get("pageSize") || "20");
  const silo = url.searchParams.get("silo") || undefined;
  const entity = url.searchParams.get("entity") || undefined;
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const where: Prisma.QcRunWhereInput = {};

  if (silo) {
    where.silo = silo;
  }

  if (entity) {
    where.entity = entity;
  }

  const startedAtFilter: Prisma.DateTimeFilter = {};
  if (fromParam) {
    const from = new Date(fromParam);
    if (!Number.isNaN(from.getTime())) {
      startedAtFilter.gte = from;
    }
  }
  if (toParam) {
    const to = new Date(toParam);
    if (!Number.isNaN(to.getTime())) {
      startedAtFilter.lte = to;
    }
  }
  if (Object.keys(startedAtFilter).length > 0) {
    where.startedAt = startedAtFilter;
  }

  const take = Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 20;
  const skip = Number.isFinite(page) && page > 1 ? (page - 1) * take : 0;

  const [runs, total] = await Promise.all([
    prisma.qcRun.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        name: true,
        brazeUrl: true,
        silo: true,
        entity: true,
        emailType: true,
        status: true,
        summaryPass: true,
        modelVersion: true,
        startedAt: true,
        finishedAt: true,
      },
    }),
    prisma.qcRun.count({ where }),
  ]);

  return NextResponse.json({
    data: runs,
    meta: {
      total,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      pageSize: take,
    },
  });
}
