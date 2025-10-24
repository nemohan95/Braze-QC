"use server";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function normaliseFeedback(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const feedback = await prisma.auditFeedback.findUnique({
    where: { runId: id },
  });

  return NextResponse.json({ feedback });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let payload: { feedback?: unknown };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const feedback = normaliseFeedback(payload.feedback);

  if (!feedback) {
    await prisma.auditFeedback
      .delete({
        where: { runId: id },
      })
      .catch(() => undefined);
    return NextResponse.json({ feedback: null });
  }

  const record = await prisma.auditFeedback.upsert({
    where: { runId: id },
    update: { feedback },
    create: { runId: id, feedback },
  });

  return NextResponse.json({ feedback: record });
}
