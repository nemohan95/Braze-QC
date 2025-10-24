import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { EMAIL_TYPE_OPTIONS, ENTITY_OPTIONS, SILO_OPTIONS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const ENTITY_SET = new Set<string>(ENTITY_OPTIONS);
const EMAIL_TYPE_SET = new Set<string>(EMAIL_TYPE_OPTIONS);
const SILO_LOOKUP = new Map<string, string>(SILO_OPTIONS.map((option) => [option.toLowerCase(), option]));
const MATCH_TYPES = new Set(["contains", "starts_with", "ends_with", "exact"]);

function normaliseString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normaliseSilo(value: unknown): string | null | "__invalid__" {
  const maybe = normaliseString(value);
  if (!maybe) {
    return null;
  }
  const resolved = SILO_LOOKUP.get(maybe.toLowerCase());
  return resolved ?? "__invalid__";
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  let payload: {
    entity?: unknown;
    silo?: unknown;
    emailType?: unknown;
    kind?: unknown;
    matchType?: unknown;
    hrefPattern?: unknown;
    notes?: unknown;
    active?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const entity = normaliseString(payload.entity);
  const silo = normaliseSilo(payload.silo);
  const emailType = normaliseString(payload.emailType) ?? "marketing";
  const kind = normaliseString(payload.kind);
  const matchType = normaliseString(payload.matchType) ?? "contains";
  const hrefPattern = normaliseString(payload.hrefPattern);
  const notes = normaliseString(payload.notes);
  const active = typeof payload.active === "boolean" ? payload.active : true;

  if (!entity || !ENTITY_SET.has(entity)) {
    return NextResponse.json({ error: "entity is required and must be a supported option" }, { status: 400 });
  }

  if (silo === "__invalid__") {
    return NextResponse.json({ error: "silo must match a supported silo option" }, { status: 400 });
  }

  if (!EMAIL_TYPE_SET.has(emailType)) {
    return NextResponse.json({ error: "emailType must be marketing or transactional" }, { status: 400 });
  }

  if (!kind) {
    return NextResponse.json({ error: "kind is required" }, { status: 400 });
  }

  if (!hrefPattern) {
    return NextResponse.json({ error: "hrefPattern is required" }, { status: 400 });
  }

  const resolvedMatchType = MATCH_TYPES.has((matchType || "").toLowerCase())
    ? (matchType as string).toLowerCase()
    : "contains";

  try {
    const record = await prisma.linkRule.update({
      where: { id: params.id },
      data: {
        entity,
        silo: silo ?? null,
        emailType,
        kind,
        matchType: resolvedMatchType,
        hrefPattern,
        notes,
        active,
      },
    });
    revalidatePath("/admin/rules");
    return NextResponse.json({ linkRule: record });
  } catch (error) {
    console.error("Failed to update link rule", error);
    return NextResponse.json({ error: "Unable to update link rule" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.linkRule.delete({ where: { id: params.id } });
    revalidatePath("/admin/rules");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete link rule", error);
    return NextResponse.json({ error: "Unable to delete link rule" }, { status: 500 });
  }
}
