import { NextRequest, NextResponse } from "next/server";

import { normaliseString } from "@/lib/normalise";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function normaliseName(value: unknown): string | null {
  const name = normaliseString(value);
  return name && name.trim() ? name.trim() : null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await prisma.qcRun.findUnique({
    where: { id },
    include: {
      checks: { orderBy: { name: "asc" } },
      links: { orderBy: { url: "asc" } },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "QC run not found" }, { status: 404 });
  }

  return NextResponse.json(run);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let payload: { name?: unknown };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const name = normaliseName(payload.name);

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const run = await prisma.qcRun.update({
      where: { id },
      data: { name },
      select: {
        id: true,
        name: true,
        silo: true,
        entity: true,
        emailType: true,
        status: true,
        summaryPass: true,
        modelVersion: true,
        startedAt: true,
        finishedAt: true,
      },
    });

    return NextResponse.json({ run });
  } catch (error) {
    console.error("Failed to update QC run name", { id, error });
    return NextResponse.json(
      { error: "Failed to update QC run name" },
      { status: 500 }
    );
  }
}
