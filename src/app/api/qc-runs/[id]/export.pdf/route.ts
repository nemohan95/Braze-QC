import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { buildRunHtml } from "@/lib/exportPdf";

export const runtime = "nodejs";


export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const html = buildRunHtml(run);
  const filename = `qc-run-${id}.html`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
