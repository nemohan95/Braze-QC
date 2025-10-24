import Link from "next/link";
import { notFound } from "next/navigation";

import { RunProgressShell } from "@/components/RunProgressShell";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QcRunDetailPage({ params }: PageProps) {
  const { id } = await params;

  const run = await prisma.qcRun.findUnique({
    where: { id },
    include: {
      checks: { orderBy: { name: "asc" } },
      links: { orderBy: { url: "asc" } },
    },
  });

  if (!run) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/qc"
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
      >
        Back to runs
      </Link>
      <RunProgressShell initialRun={run} />
    </div>
  );
}
