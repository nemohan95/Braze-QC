import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { buildRunCsv } from "@/lib/exportCsv";

export const runtime = "nodejs";


export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await prisma.qcRun.findUnique({
    where: { id },
    include: {
      checks: { orderBy: { name: "asc" } },
      links: { orderBy: { url: "asc" } },
      issueFeedback: true,
      auditFeedback: true,
    },
  });

  if (!run) {
    return NextResponse.json({ error: "QC run not found" }, { status: 404 });
  }

  const csv = buildRunCsv(run);
  const filename = `qc-run-${id}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
