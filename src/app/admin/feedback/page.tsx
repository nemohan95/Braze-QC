import Link from "next/link";

import { prisma } from "@/lib/prisma";

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export default async function AdminFeedbackPage() {
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

  return (
    <section className="space-y-12">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 text-slate-100 shadow-2xl shadow-slate-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.2),_transparent_60%)]" />
        <div className="relative space-y-6 p-8 md:p-10">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
              Quality Insights
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Feedback Inbox</h1>
            <p className="max-w-3xl text-sm text-slate-300 md:text-base">
              Review unwanted issue reports and run-level QC notes to spot false positives and prioritise retraining work. Each entry links back to its run for fast triage.
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Unwanted Issue Feedback</h2>
            <p className="text-sm text-slate-600">
              Submitted when reviewers believe a flagged issue is a false positive. Use this data to refine the model or adjust rule coverage.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {unwantedIssues.length} records
          </span>
        </header>

        {unwantedIssues.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            No unwanted feedback captured yet. Encourage reviewers to flag false positives directly from the QC report.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80">
            <div className="max-h-[32rem] overflow-y-auto bg-white/95">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-900/5 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Run</th>
                    <th className="px-4 py-3">Issue</th>
                    <th className="px-4 py-3">Feedback</th>
                    <th className="px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {unwantedIssues.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <Link
                            href={`/qc/${item.run.id}`}
                            className="font-semibold text-indigo-600 hover:underline"
                          >
                            {item.run.name || item.run.id.slice(0, 8)}
                          </Link>
                          <div className="text-xs text-slate-500">
                            {item.run.silo} · {item.run.entity}
                          </div>
                          <div className="text-xs text-slate-500">
                            Model {item.run.modelVersion ?? "?"} · Started {formatDateTime(item.run.startedAt)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-800">{item.check.name}</div>
                          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                            {item.check.type.replace("_", " ")}
                          </div>
                          {item.check.details ? (
                            <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-900/5 px-3 py-2 text-xs text-slate-600">
                              {JSON.stringify(item.check.details, null, 2)}
                            </pre>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{item.feedback}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(item.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Run-Level QC Feedback</h2>
            <p className="text-sm text-slate-600">
              High-level comments from reviewers about the overall audit quality or missing checks.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {generalFeedback.length} records
          </span>
        </header>

        {generalFeedback.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            No run-level feedback captured yet.
          </p>
        ) : (
          <div className="space-y-4">
            {generalFeedback.map((entry) => (
              <article
                key={entry.id}
                className="space-y-3 rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm"
              >
                <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link href={`/qc/${entry.run.id}`} className="font-semibold text-indigo-600 hover:underline">
                      {entry.run.name || entry.run.id.slice(0, 8)}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {entry.run.silo} · {entry.run.entity} · Model {entry.run.modelVersion ?? "?"}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">Updated {formatDateTime(entry.updatedAt)}</span>
                </header>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{entry.feedback}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
