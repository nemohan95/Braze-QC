import Link from "next/link";

import type { RunWithRelations } from "@/lib/exportCsv";

import { ReportDownloadControls } from "./ReportDownloadControls";

const CHECK_SECTIONS: Array<{
  title: string;
  type: RunWithRelations["checks"][number]["type"];
  description: string;
}> = [
  {
    title: "Content Mismatch",
    type: "content_mismatch",
    description: "Compares subject, preheader, body copy, and CTAs with the copy document.",
  },
  {
    title: "Subject & Preheader",
    type: "subject_preheader",
    description: "Flag alignment issues or missing values for the envelope copy.",
  },
  {
    title: "Disclaimers",
    type: "disclaimer",
    description: "Validates entity and silo risk warnings and required legal text.",
  },
  {
    title: "Link Requirements",
    type: "link_requirement",
    description: "Checks mandatory marketing links and ensures the email covers copy doc CTAs.",
  },
  {
    title: "Keyword Disclaimers",
    type: "keyword_disclaimer",
    description: "Enforces vendor-specific statements triggered by keyword detection.",
  },
];

function formatDate(value: Date | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  };
  return date.toLocaleString('en-GB', options);
}

function formatDetails(details: unknown): string {
  if (!details) {
    return "";
  }
  if (typeof details === "string") {
    return details;
  }
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

function PassChip({ pass }: { pass: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.2em] ${
        pass
          ? "bg-emerald-100/80 text-emerald-700 ring-1 ring-inset ring-emerald-300/70"
          : "bg-rose-100/80 text-rose-600 ring-1 ring-inset ring-rose-300/70"
      }`}
    >
      {pass ? "Pass" : "Fail"}
    </span>
  );
}

export function ReportView({ run, showHeading = true }: { run: RunWithRelations; showHeading?: boolean }) {
  const reportElementId = `qc-report-${run.id}`;
  const summaryBadge = run.summaryPass === true
    ? { label: "Pass", className: "bg-emerald-100 text-emerald-700" }
    : run.summaryPass === false
      ? { label: "Fail", className: "bg-rose-100 text-rose-600" }
      : { label: "Pending", className: "bg-slate-200 text-slate-700" };
  const copyDocLinks = Array.isArray(run.copyDocLinks)
    ? (run.copyDocLinks as Array<Record<string, unknown>>)
        .map((item) => {
          const href = typeof item?.href === "string" ? item.href : "";
          if (!href) {
            return null;
          }
          const label = typeof item?.label === "string" ? item.label : "";
          return { href, label };
        })
        .filter((entry): entry is { href: string; label: string } => Boolean(entry))
    : [];

  return (
    <div className="space-y-10">
      {showHeading ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/70 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">QC Run {run.id}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Silo {run.silo}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                <span className="h-2 w-2 rounded-full bg-sky-400" /> Entity {run.entity}
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${summaryBadge.className}`}
              >
                {summaryBadge.label}
              </span>
            </div>
          </div>
          <ReportDownloadControls runId={run.id} targetElementId={reportElementId} />
        </div>
      ) : (
        <div className="flex justify-end">
          <ReportDownloadControls runId={run.id} targetElementId={reportElementId} />
        </div>
      )}

      <div
        id={reportElementId}
        className="space-y-12 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/80"
      >
        <section className="space-y-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Overview</h2>
              <p className="text-sm text-slate-600">Run metadata, timing, and model snapshot.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Model {run.modelVersion ?? "Unknown"}
            </div>
          </header>
          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Started</dt>
              <dd className="mt-2 text-sm font-medium text-slate-800">{formatDate(run.startedAt)}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Finished</dt>
              <dd className="mt-2 text-sm font-medium text-slate-800">{formatDate(run.finishedAt)}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Summary state</dt>
              <dd className="mt-2 text-sm font-medium text-slate-800">{summaryBadge.label}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Checks captured</dt>
              <dd className="mt-2 text-sm font-medium text-slate-800">{run.checks.length}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-5 sm:col-span-2 xl:col-span-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Braze preview</dt>
              <dd className="mt-2 text-sm font-medium text-indigo-600">
                <Link href={run.brazeUrl} target="_blank" rel="noopener noreferrer" className="break-words hover:underline">
                  {run.brazeUrl}
                </Link>
              </dd>
            </div>
          </dl>
        </section>

        {CHECK_SECTIONS.map((section) => {
          const checks = run.checks.filter((check) => check.type === section.type);
          return (
            <section key={section.type} className="space-y-4">
              <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{section.title}</h3>
                  <p className="text-sm text-slate-600">{section.description}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {checks.length} checks
                </span>
              </header>
              {checks.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  No checks recorded for this section.
                </p>
              ) : (
                <ul className="space-y-4">
                  {checks.map((check) => (
                    <li
                      key={check.id}
                      className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-lg"
                    >
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-400 via-sky-400 to-indigo-300 opacity-0 transition group-hover:opacity-100" />
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-base font-semibold text-slate-900">{check.name}</span>
                            <PassChip pass={check.pass} />
                          </div>
                          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-400">
                            {check.type.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                      {check.details ? (
                        <pre className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-900/5 p-4 text-xs leading-relaxed text-slate-700">
                          {formatDetails(check.details)}
                        </pre>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        <section className="space-y-4">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Link Checks</h3>
              <p className="text-sm text-slate-600">HTTP status, redirect behavior, and final destinations.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {run.links.length} links
            </span>
          </header>
          {run.links.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              No links detected in this run.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-900/5">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    <th className="px-4 py-3">URL</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Redirected</th>
                    <th className="px-4 py-3">Final URL</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {run.links.map((link) => (
                    <tr key={link.id} className="align-top">
                      <td className="max-w-lg px-4 py-3 text-indigo-600">
                        <a href={link.url} rel="noopener noreferrer" target="_blank" className="break-words hover:underline">
                          {link.url}
                        </a>
                      </td>
                      <td className="px-4 py-3">{link.statusCode ?? "-"}</td>
                      <td className="px-4 py-3">{link.redirected ? "Yes" : "No"}</td>
                      <td className="max-w-lg px-4 py-3">{link.finalUrl ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-500">{link.notes ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Copy Document</h3>
              <p className="text-sm text-slate-600">Reference copy collected during the run.</p>
            </div>
            {copyDocLinks.length > 0 ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {copyDocLinks.length} attachments
              </span>
            ) : null}
          </header>
          {copyDocLinks.length > 0 ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm">
              <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Captured links ({copyDocLinks.length})
              </h4>
              <ul className="mt-3 space-y-3 text-sm">
                {copyDocLinks.map((item, index) => (
                  <li key={`${item.href}-${index}`} className="space-y-1">
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 break-words text-indigo-600 hover:underline"
                    >
                      {item.href}
                      <span aria-hidden>-&gt;</span>
                    </a>
                    {item.label ? <div className="text-xs text-slate-500">Label: {item.label}</div> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              No copy doc links captured for this run.
            </p>
          )}
          <details className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50">
            <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-700 transition group-open:bg-slate-100">
              Show copy doc text
            </summary>
            <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-slate-700">
              {run.copyDocText}
            </pre>
          </details>
        </section>
      </div>
    </div>
  );
}
