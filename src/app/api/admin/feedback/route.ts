"use server";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const [unwantedIssues, generalFeedback] = await Promise.all([
    prisma.auditIssueFeedback.findMany({
      where: { status: "unwanted" },
      orderBy: { updatedAt: "desc" },
      include: {
        check: {
          select: {
            id: true,
            name: true,
            type: true,
            pass: true,
            details: true,
          },
        },
        run: {
          select: {
            id: true,
            name: true,
            silo: true,
            entity: true,
            status: true,
            summaryPass: true,
            modelVersion: true,
            startedAt: true,
          },
        },
      },
      take: 200,
    }),
    prisma.auditFeedback.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        run: {
          select: {
            id: true,
            name: true,
            silo: true,
            entity: true,
            status: true,
            summaryPass: true,
            modelVersion: true,
            startedAt: true,
          },
        },
      },
      take: 200,
    }),
  ]);

  return NextResponse.json({
    unwantedIssues,
    generalFeedback,
  });
}
