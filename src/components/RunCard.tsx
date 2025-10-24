import Link from "next/link";
import { useState } from "react";

import type { QcRun } from "@prisma/client";

import { STAGE_METADATA, stageProgress } from "@/lib/qcProgress";

function formatDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusBadge(summaryPass: boolean | null | undefined, status: string) {
  if (status === "completed") {
    if (summaryPass === undefined || summaryPass === null) {
      return {
        label: "Pending",
        className: "bg-slate-200/70 text-slate-700 ring-1 ring-inset ring-slate-300",
      };
    }

    return summaryPass
      ? {
          label: "Pass",
          className: "bg-emerald-100/80 text-emerald-700 ring-1 ring-inset ring-emerald-400/60",
        }
      : {
          label: "Fail",
          className: "bg-rose-100/80 text-rose-600 ring-1 ring-inset ring-rose-300/60",
        };
  }

  if (status === "failed") {
    return {
      label: "Failed",
      className: "bg-rose-100/80 text-rose-600 ring-1 ring-inset ring-rose-300/60",
    };
  }

  const metadata = STAGE_METADATA[status as keyof typeof STAGE_METADATA];
  if (metadata) {
    return {
      label: metadata.label,
      className: "bg-indigo-100/80 text-indigo-700 ring-1 ring-inset ring-indigo-300/50",
    };
  }

  return {
    label: status,
    className: "bg-slate-200/70 text-slate-700 ring-1 ring-inset ring-slate-300",
  };
}

interface RunCardProps {
  run: Pick<
    QcRun,
    | "id"
    | "name"
    | "silo"
    | "entity"
    | "emailType"
    | "status"
    | "summaryPass"
    | "modelVersion"
    | "startedAt"
  >;
  onRename?: (id: string, newName: string) => Promise<void>;
}

export function RunCard({ run, onRename }: RunCardProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(run.name || "");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isSubmittingRename, setIsSubmittingRename] = useState(false);

  const badge = getStatusBadge(run.summaryPass, run.status);
  const stageKey = run.status as keyof typeof STAGE_METADATA;
  const metadata = STAGE_METADATA[stageKey];
  const progress = metadata ? stageProgress(stageKey) : null;
  const showProgress = metadata && run.status !== "completed" && run.status !== "failed";
  const emailTypeLabel = run.emailType
    ? run.emailType.charAt(0).toUpperCase() + run.emailType.slice(1)
    : "Marketing";
  const summaryChip =
    run.status === "completed"
      ? run.summaryPass === true
        ? {
            label: "Passed",
            className: "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200",
          }
        : run.summaryPass === false
          ? {
              label: "Needs follow-up",
              className: "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200",
            }
          : null
      : null;

  const displayName = run.name || `QC Run ${run.id.slice(0, 8)}`;

  const handleRename = async () => {
    if (!onRename) return;

    setIsSubmittingRename(true);
    setRenameError(null);

    try {
      await onRename(run.id, renameValue.trim());
      setIsRenaming(false);
    } catch (error) {
      setRenameError((error as Error).message || "Failed to rename");
    } finally {
      setIsSubmittingRename(false);
    }
  };

  const cancelRename = () => {
    setRenameValue(run.name || "");
    setIsRenaming(false);
    setRenameError(null);
  };

  return (
    <li className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-md shadow-slate-200/80 transition hover:-translate-y-1 hover:shadow-xl">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-400 via-sky-400 to-purple-400 opacity-80 transition group-hover:opacity-100" />
      <div className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              <span>{run.silo}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{run.entity}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{emailTypeLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              {isRenaming ? (
                <div className="flex-1">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRename();
                      } else if (e.key === "Escape") {
                        cancelRename();
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    disabled={isSubmittingRename}
                    autoFocus
                  />
                  {renameError && (
                    <p className="mt-1 text-xs text-rose-600">{renameError}</p>
                  )}
                </div>
              ) : (
                <Link
                  href={`/qc/${run.id}`}
                  className="text-xl font-semibold text-slate-900 transition hover:text-indigo-600"
                >
                  {displayName}
                </Link>
              )}
              {onRename && !isRenaming && (
                <button
                  type="button"
                  onClick={() => setIsRenaming(true)}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
                  title="Rename audit"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              {isRenaming && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={handleRename}
                    disabled={isSubmittingRename || !renameValue.trim()}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Save"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={cancelRename}
                    disabled={isSubmittingRename}
                    className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Cancel"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
              {badge.label}
            </span>
            {summaryChip ? (
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${summaryChip.className}`}>
                {summaryChip.label}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-xl bg-slate-50/80 p-4">
            <span className="text-xs uppercase tracking-widest text-slate-400">Started</span>
            <span className="font-medium text-slate-800">{formatDate(run.startedAt)}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl bg-slate-50/80 p-4">
            <span className="text-xs uppercase tracking-widest text-slate-400">Model</span>
            <span className="font-medium text-slate-800">{run.modelVersion ?? "n/a"}</span>
          </div>
        </div>

        {showProgress && metadata && progress !== null ? (
          <div className="space-y-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-400 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-slate-400">
              <span>{metadata.label}</span>
              <span>{progress}%</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">{metadata.description}</p>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-slate-400">View details</p>
          <Link
            href={`/qc/${run.id}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-500"
          >
            Open report
            <span aria-hidden className="text-base">→</span>
          </Link>
        </div>
      </div>
    </li>
  );
}
