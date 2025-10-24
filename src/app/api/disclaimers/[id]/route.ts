import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { Prisma } from "@prisma/client";

import { EMAIL_TYPE_OPTIONS, ENTITY_OPTIONS, SILO_OPTIONS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const ENTITY_SET = new Set<string>(ENTITY_OPTIONS);
const SILO_LOOKUP = new Map<string, string>(
  SILO_OPTIONS.map((option) => [option.toLowerCase(), option]),
);
const EMAIL_TYPE_SET = new Set<string>(EMAIL_TYPE_OPTIONS);

function normaliseString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normaliseSilo(value: unknown): string | null | "__invalid__" {
  const normalised = normaliseString(value);
  if (normalised === null) {
    return null;
  }
  const resolved = SILO_LOOKUP.get(normalised.toLowerCase());
  return resolved ?? "__invalid__";
}

function booleanFromValue(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "true" || trimmed === "1" || trimmed === "yes") {
      return true;
    }
    if (trimmed === "false" || trimmed === "0" || trimmed === "no") {
      return false;
    }
  }
  return null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "id parameter is required" }, { status: 400 });
  }

  let payload: {
    entity?: unknown;
    silo?: unknown;
    kind?: unknown;
    text?: unknown;
    version?: unknown;
    active?: unknown;
    emailType?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const entity = payload.entity !== undefined ? normaliseString(payload.entity) : undefined;
  const silo = payload.silo !== undefined ? normaliseSilo(payload.silo) : undefined;
  const kind = payload.kind !== undefined ? normaliseString(payload.kind) : undefined;
  const text = payload.text !== undefined ? normaliseString(payload.text) : undefined;
  const version = payload.version !== undefined ? normaliseString(payload.version) : undefined;
  const active = payload.active !== undefined ? booleanFromValue(payload.active) : undefined;
  const emailType = payload.emailType !== undefined ? normaliseString(payload.emailType) : undefined;

  if (entity !== undefined && (!entity || !ENTITY_SET.has(entity))) {
    return NextResponse.json({ error: "entity must be a supported option" }, { status: 400 });
  }

  if (silo === "__invalid__") {
    return NextResponse.json({ error: "silo must be a supported option" }, { status: 400 });
  }

  if (kind !== undefined && !kind) {
    return NextResponse.json({ error: "kind cannot be empty" }, { status: 400 });
  }

  if (text !== undefined && !text) {
    return NextResponse.json({ error: "text cannot be empty" }, { status: 400 });
  }

  if (emailType !== undefined && (!emailType || !EMAIL_TYPE_SET.has(emailType))) {
    return NextResponse.json({ error: "emailType must be marketing or transactional" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (entity !== undefined) {
    data.entity = entity;
  }
  if (silo !== undefined) {
    data.silo = silo;
  }
  if (kind !== undefined) {
    data.kind = kind;
  }
  if (text !== undefined) {
    data.text = text;
  }
  if (version !== undefined) {
    data.version = version || "v1";
  }
  if (active !== undefined) {
    data.active = active;
  }
  if (emailType !== undefined) {
    data.emailType = emailType;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields provided" }, { status: 400 });
  }

  try {
    const record = await prisma.disclaimerRule.update({
      where: { id },
      data,
    });
    revalidatePath("/admin/rules");
    return NextResponse.json({ disclaimer: record });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Disclaimer not found" }, { status: 404 });
    }
    console.error("Failed to update disclaimer", error);
    return NextResponse.json({ error: "Unable to update disclaimer" }, { status: 500 });
  }
}
