import { createHash } from "crypto";

import { parse } from "csv-parse/sync";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { ENTITY_OPTIONS, SILO_OPTIONS } from "@/lib/constants";

const ENTITY_SET = new Set<string>(ENTITY_OPTIONS);
const SILO_LOOKUP = new Map<string, string>(
  SILO_OPTIONS.map((option) => [option.toLowerCase(), option]),
);

function normaliseOption(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

export const runtime = "nodejs";

function parseCsv(text: string) {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;
}

function booleanFromString(value: string | undefined): boolean {
  if (!value) {
    return true;
  }
  const lower = value.trim().toLowerCase();
  return lower === "true" || lower === "1" || lower === "yes";
}

function deterministicId(prefix: string, parts: Array<string | undefined>): string {
  const hash = createHash("sha256");
  hash.update(prefix);
  parts.forEach((part) => hash.update("::" + (part?.trim().toLowerCase() ?? "")));
  return `${prefix}_${hash.digest("hex").slice(0, 24)}`;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const riskFile = formData.get("riskRules");
  const keywordFile = formData.get("keywordRules");
  const additionalFile = formData.get("additionalRules");

  const summary = {
    riskRules: 0,
    keywordRules: 0,
    additionalRules: 0,
  };

  const operations: Array<Promise<unknown>> = [];

  if (riskFile instanceof File) {
    const rows = parseCsv(await riskFile.text());
    rows.forEach((row) => {
      const entity = row.entity;
      const variant = row.variant;
      const text = row.text;
      if (!entity || !variant || !text) {
        return;
      }
      const siloFilter = row.siloFilter || null;
      const version = row.version || "v1";
      const active = booleanFromString(row.active);
      const id = deterministicId("risk", [entity, variant, siloFilter ?? undefined, text]);
      operations.push(
        prisma.riskRule.upsert({
          where: { id },
          update: { entity, variant, siloFilter, text, version, active },
          create: { id, entity, variant, siloFilter, text, version, active },
        }),
      );
      summary.riskRules += 1;
    });
  }

  if (keywordFile instanceof File) {
    const rows = parseCsv(await keywordFile.text());
    rows.forEach((row) => {
      const keyword = row.keyword;
      const requiredText = row.requiredText;
      if (!keyword || !requiredText) {
        return;
      }
      const active = booleanFromString(row.active);
      const id = deterministicId("keyword", [keyword, requiredText]);
      operations.push(
        prisma.keywordRule.upsert({
          where: { id },
          update: { keyword, requiredText, active },
          create: { id, keyword, requiredText, active },
        }),
      );
      summary.keywordRules += 1;
    });
  }

  if (additionalFile instanceof File) {
    const rows = parseCsv(await additionalFile.text());
    rows.forEach((row) => {
      const topic = normaliseOption(row.topic);
      const rawSilo = normaliseOption(row.silo);
      const rawEntity = normaliseOption(row.entity);
      const text = normaliseOption(row.text);
      if (!topic || !rawSilo || !rawEntity || !text) {
        return;
      }
      const silo = SILO_LOOKUP.get(rawSilo.toLowerCase()) ?? rawSilo;
      const upperEntity = rawEntity.toUpperCase();
      const entity = ENTITY_SET.has(upperEntity) ? upperEntity : rawEntity;
      const version = row.version || "v1";
      const active = booleanFromString(row.active);
      let links: unknown = undefined;
      if (row.links) {
        try {
          links = JSON.parse(row.links);
        } catch {
          links = row.links;
        }
      }
      const notes = row.notes || null;
      const id = deterministicId("additional", [topic, silo, entity, text]);
      operations.push(
        prisma.additionalRule.upsert({
          where: { id },
          update: { topic, silo, entity, text, links: links as never, notes, version, active },
          create: { id, topic, silo, entity, text, links: links as never, notes, version, active },
        }),
      );
      summary.additionalRules += 1;
    });
  }

  if (operations.length === 0) {
    return NextResponse.json({ error: "No CSV files provided" }, { status: 400 });
  }

  try {
    await prisma.$transaction(operations as never[]);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("Failed to import rules", error);
    return NextResponse.json({ error: "Failed to import CSV rules" }, { status: 500 });
  }
}
