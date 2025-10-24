"use server";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const ISSUE_STATUSES = ["open", "resolved", "unwanted"] as const;
type IssueStatus = (typeof ISSUE_STATUSES)[number];

function isIssueStatus(value: unknown): value is IssueStatus {
  return typeof value === "string" && ISSUE_STATUSES.includes(value as IssueStatus);
}

function normaliseFeedback(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const runtime = "nodejs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; checkId: string }> },
) {
  const { id, checkId } = await params;

  let payload: { status?: unknown; feedback?: unknown };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!isIssueStatus(payload.status)) {
    return NextResponse.json(
      { error: "status must be one of open, resolved, unwanted" },
      { status: 400 },
    );
  }

  const feedback = normaliseFeedback(payload.feedback);

  if (payload.status === "unwanted" && !feedback) {
    return NextResponse.json(
      { error: "Feedback is required when marking an issue as unwanted" },
      { status: 400 },
    );
  }

  const check = await prisma.checkResult.findUnique({
    where: { id: checkId },
    select: { runId: true },
  });

  if (!check || check.runId !== id) {
    return NextResponse.json({ error: "Check not found for this run" }, { status: 404 });
  }

  const record = await prisma.auditIssueFeedback.upsert({
    where: { checkId },
    update: {
      status: payload.status,
      feedback,
    },
    create: {
      runId: id,
      checkId,
      status: payload.status,
      feedback,
    },
  });

  return NextResponse.json({ feedback: record });
}
