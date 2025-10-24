"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { RunWithRelations } from "@/lib/exportCsv";
import {
  QcProgressStage,
  STAGE_METADATA,
  STAGE_SEQUENCE,
  stageIndex,
  stageProgress,
} from "@/lib/qcProgress";

import { ReportView } from "./ReportView";

type StableStage = (typeof STAGE_SEQUENCE)[number];

const TERMINAL_STAGES: QcProgressStage[] = ["completed", "failed"];
const POLL_INTERVAL_MS = 1500;

function isTerminal(stage: string): stage is "completed" | "failed" {
  return TERMINAL_STAGES.includes(stage as QcProgressStage);
}

function resolveStage(status: string): QcProgressStage {
  if (status in STAGE_METADATA) {
    return status as QcProgressStage;
  }
  return "queued";
}

function formatFailureDetail(check: RunWithRelations["checks"][number]): string {
  const details = check.details;
  let detailText: string | null = null;

  if (typeof details === "string") {
    detailText = details.trim() || null;
  } else if (details && typeof details === "object") {
    try {
      detailText = JSON.stringify(details);
    } catch {
      detailText = String(details);
    }
  }

  if (detailText) {
    return `${check.name}: ${detailText}`;
  }

  return check.name;
}

function formatElapsed(durationMs: number): string {
  if (durationMs <= 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${minutes}:${seconds}`;
  }

  return `${minutes}:${seconds}`;
}

type RawRun = RunWithRelations & {
  startedAt: string | Date;
  finishedAt?: string | Date | null;
};

function hydrateRun(json: RawRun): RunWithRelations {
  return {
    ...json,
    startedAt: json.startedAt ? new Date(json.startedAt) : new Date(),
    finishedAt: json.finishedAt ? new Date(json.finishedAt) : null,
  } as RunWithRelations;
}

function computeElapsed(run: RunWithRelations, now = Date.now()): number {
  const start = run.startedAt ? new Date(run.startedAt).getTime() : now;
  if (run.finishedAt) {
    return Math.max(0, new Date(run.finishedAt).getTime() - start);
  }
  return Math.max(0, now - start);
}

export function RunProgressShell({ initialRun }: { initialRun: RunWithRelations }) {
  const [run, setRun] = useState<RunWithRelations>(() => hydrateRun(initialRun));
  const [elapsedMs, setElapsedMs] = useState<number>(() => computeElapsed(initialRun));
  const [isPolling, setIsPolling] = useState<boolean>(() => !isTerminal(initialRun.status));
  const [lastStableStage, setLastStableStage] = useState<StableStage>(() => {
    const resolved = resolveStage(initialRun.status);
    return resolved === "failed" ? "queued" : (resolved as StableStage);
  });

  const stage = resolveStage(run.status);
  const metadata = STAGE_METADATA[stage];
  const hasFailed = stage === "failed";
  const progressStage = (hasFailed ? lastStableStage : stage) as StableStage;
  const progressPercent = stageProgress(progressStage, elapsedMs);
  const currentIndex = stageIndex(progressStage);
  const isTerminalComplete = progressStage === "completed";
  const emailTypeLabel = run.emailType
    ? run.emailType.charAt(0).toUpperCase() + run.emailType.slice(1)
    : "Marketing";
  const failureChecks = run.checks.filter((check) => check.pass === false);
  const failureMessages = failureChecks.map(formatFailureDetail);
  const failureSummary =
    failureMessages.length > 0
      ? failureMessages[0]
      : "This run hit an unexpected error. Double-check the Braze preview URL and copy doc, then try again.";

  const displayName = run.name ? `${run.name} – ${run.id.slice(0, 8)}` : run.id.slice(0, 8);


  // Poll the API for updated run status until we reach a terminal state.
  useEffect(() => {
    if (!isPolling) {
      return undefined;
    }

    const interval = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/qc-runs/${run.id}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as RawRun;
        const hydrated = hydrateRun(payload);
        const incomingStage = resolveStage(hydrated.status);
        if (incomingStage !== "failed") {
          setLastStableStage(incomingStage as StableStage);
        }
        setRun(hydrated);
        if (isTerminal(hydrated.status)) {
          setIsPolling(false);
          setElapsedMs(computeElapsed(hydrated));
        }
      } catch (error) {
        console.error("Failed to poll QC run", error);
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isPolling, run.id]);

  // Track elapsed time locally for a lightweight timer effect.
  useEffect(() => {
    if (isTerminal(run.status)) {
      setElapsedMs(computeElapsed(run));
      return undefined;
    }

    const ticker = window.setInterval(() => {
      setElapsedMs(computeElapsed(run));
    }, 1000);

    return () => window.clearInterval(ticker);
  }, [run]);

  const elapsedLabel = useMemo(() => formatElapsed(elapsedMs), [elapsedMs]);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 text-slate-100 shadow-2xl shadow-slate-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.2),_transparent_60%)]" />
        <div className="relative flex flex-col gap-8 p-8 md:p-10">
          <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Run {displayName}</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                {run.name ? run.name : 'QC Progress'}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-medium text-white/80">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" /> Silo: {run.silo}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-medium text-white/80">
                  <span className="h-2 w-2 rounded-full bg-sky-300" /> Entity: {run.entity}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-medium text-white/80">
                  <span className="h-2 w-2 rounded-full bg-lime-300" /> Email: {emailTypeLabel}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 text-sm lg:items-end">
              <span
                className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] ${
                  stage === "failed"
                    ? "bg-rose-500/20 text-rose-200 ring-1 ring-inset ring-rose-400/40"
                    : stage === "completed"
                      ? "bg-emerald-500/20 text-emerald-100 ring-1 ring-inset ring-emerald-300/40"
                      : "bg-indigo-500/20 text-indigo-100 ring-1 ring-inset ring-indigo-300/40"
                }`}
              >
                {metadata.label}
              </span>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Elapsed {elapsedLabel}</span>
            </div>
          </header>

          <dl className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm backdrop-blur md:grid-cols-4">
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">Status</dt>
              <dd className="text-lg font-semibold text-white">{metadata.label}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">Stage index</dt>
              <dd className="text-lg font-semibold text-white">{currentIndex + 1} / {STAGE_SEQUENCE.length}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">Active checks</dt>
              <dd className="text-lg font-semibold text-white">{failureChecks.length > 0 ? failureChecks.length : "All passing"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">Summary</dt>
              <dd className="text-lg font-semibold text-white">
                {run.summaryPass === true ? "Pass" : run.summaryPass === false ? "Fail" : "Pending"}
              </dd>
            </div>
          </dl>

          <div className="space-y-4">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/80">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${
                  stage === "failed"
                    ? "from-rose-400 via-rose-500 to-rose-400"
                    : stage === "completed"
                      ? "from-emerald-400 via-emerald-500 to-emerald-400"
                      : "from-indigo-400 via-sky-400 to-indigo-300"
                } transition-all duration-500 ease-out`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
              <span>{metadata.label}</span>
              <span>{progressPercent}%</span>
            </div>
            <p className="text-sm text-slate-300">{metadata.description}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-6 text-sm text-slate-100 backdrop-blur">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">
                Focus prompt
              </span>
              <p className="mt-2 text-base leading-relaxed text-white/90">{metadata.prompt}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-200 backdrop-blur">
              <span className="font-semibold uppercase tracking-[0.3em] text-slate-300">Run insight</span>
              <p className="mt-2 leading-relaxed text-slate-200">
                {stage === "completed"
                  ? "Report locked with final checks. Export the summary or dig into the sections below."
                  : stage === "failed"
                    ? failureSummary
                    : metadata.description}
              </p>
            </div>
          </div>

          <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {STAGE_SEQUENCE.map((step, index) => {
              const info = STAGE_METADATA[step];
              const stepIndex = stageIndex(step);
              const isStepComplete = stepIndex < currentIndex || (isTerminalComplete && step === "completed");
              const isStalled = stage === "failed" && stepIndex === currentIndex;
              const isActive = !isStalled && !isTerminalComplete && stepIndex === currentIndex;

              return (
                <li
                  key={step}
                  className={`relative overflow-hidden rounded-2xl border p-4 text-sm shadow-sm transition ${
                    isStepComplete
                      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                      : isStalled
                        ? "border-rose-400/50 bg-rose-500/10 text-rose-100"
                        : isActive
                          ? "border-indigo-400/50 bg-indigo-500/10 text-indigo-100"
                          : "border-white/10 bg-white/5 text-slate-200"
                  }`}
                >
                  <span
                    className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                      isStepComplete
                        ? "bg-emerald-400 text-slate-900"
                        : isStalled
                          ? "bg-rose-400 text-slate-900"
                          : isActive
                            ? "bg-indigo-400 text-slate-900"
                            : "bg-white/10 text-white"
                    }`}
                  >
                    {isStepComplete ? "✓" : isStalled ? "!" : index + 1}
                  </span>
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-white">{info.label}</p>
                    <p className="text-xs leading-relaxed text-white/80">{info.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          {stage === "failed" ? (
            <div className="space-y-4 rounded-2xl border border-rose-500/40 bg-rose-500/15 p-6 text-sm text-rose-50">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold uppercase tracking-[0.3em]">Run blocked</h2>
                <span className="rounded-full bg-rose-500/40 px-3 py-1 text-xs font-semibold text-white">
                  {failureMessages.length} failing checks
                </span>
              </div>
              <p>{failureSummary}</p>
              {failureMessages.length > 1 ? (
                <ul className="space-y-2 text-xs">
                  {failureMessages.slice(1).map((message, index) => (
                    <li key={index} className="rounded-lg bg-black/10 px-3 py-2">
                      {message}
                    </li>
                  ))}
                </ul>
              ) : null}
              <Link
                href="/qc/new"
                className="inline-flex w-fit items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50"
              >
                Start a fresh run
                <span aria-hidden>-&gt;</span>
              </Link>
            </div>
          ) : null}

          {stage !== "completed" ? (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-slate-300">
              Hang tight—your full report drops the moment we hit Ready for review.
            </div>
          ) : null}
        </div>
      </section>

      {stage === "completed" ? <ReportView run={run} showHeading={false} /> : null}
    </div>
  );
}
