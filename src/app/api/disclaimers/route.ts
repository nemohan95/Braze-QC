import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

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
  if (!normalised) {
    return null;
  }
  const resolved = SILO_LOOKUP.get(normalised.toLowerCase());
  return resolved ?? "__invalid__";
}

export async function GET() {
  try {
    const records = await prisma.disclaimerRule.findMany({
      orderBy: [{ entity: "asc" }, { silo: "asc" }, { emailType: "asc" }, { kind: "asc" }],
    });
    return NextResponse.json({ disclaimers: records });
  } catch (error) {
    console.error("Failed to fetch disclaimers", error);
    return NextResponse.json({ error: "Unable to load disclaimers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

  const entity = normaliseString(payload.entity);
  const kind = normaliseString(payload.kind);
  const text = normaliseString(payload.text);
  const version = normaliseString(payload.version) ?? "v1";
  const active = typeof payload.active === "boolean" ? payload.active : true;
  const silo = normaliseSilo(payload.silo);
  const emailType = normaliseString(payload.emailType) ?? "marketing";

  if (!entity || !ENTITY_SET.has(entity)) {
    return NextResponse.json({ error: "entity is required and must be a supported option" }, { status: 400 });
  }

  if (silo === "__invalid__") {
    return NextResponse.json({ error: "silo must be one of the supported silo options" }, { status: 400 });
  }

  if (!kind) {
    return NextResponse.json({ error: "kind is required" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  if (!EMAIL_TYPE_SET.has(emailType)) {
    return NextResponse.json({ error: "emailType must be marketing or transactional" }, { status: 400 });
  }

  try {
    const record = await prisma.disclaimerRule.create({
      data: {
        entity,
        silo: silo ?? null,
        kind,
        text,
        version,
        active,
        emailType,
      },
    });
    revalidatePath("/admin/rules");
    return NextResponse.json({ disclaimer: record }, { status: 201 });
  } catch (error) {
    console.error("Failed to create disclaimer", error);
    return NextResponse.json({ error: "Unable to create disclaimer" }, { status: 500 });
  }
}
