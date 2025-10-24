"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type IssueStatus = "open" | "resolved" | "unwanted";
type IssueFilter = "all" | IssueStatus;

const ISSUE_FILTER_OPTIONS: Array<{ value: IssueFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "unwanted", label: "Unwanted" },
];

interface IssueState {
  status: IssueStatus;
  feedback: string;
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
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

function IssueStatusBadge({ status }: { status: IssueStatus }) {
  const styling =
    status === "resolved"
      ? "bg-emerald-500/15 text-emerald-700 ring-1 ring-inset ring-emerald-400/40"
      : status === "unwanted"
        ? "bg-amber-500/20 text-amber-800 ring-1 ring-inset ring-amber-500/40"
        : "bg-slate-200 text-slate-700 ring-1 ring-inset ring-slate-300/60";

  const label =
    status === "resolved" ? "Resolved" : status === "unwanted" ? "Unwanted" : "Open";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${styling}`}>
      {label}
    </span>
  );
}

function buildIssueStateMap(run: RunWithRelations): Record<string, IssueState> {
  const draft: Record<string, IssueState> = {};

  run.checks.forEach((check) => {
    draft[check.id] = {
      status: "open",
      feedback: "",
    };
  });

  run.issueFeedback.forEach((entry) => {
    draft[entry.checkId] = {
      status: (entry.status ?? "open") as IssueStatus,
      feedback: entry.feedback ?? "",
    };
  });

  return draft;
}

export function ReportView({ run, showHeading = true }: { run: RunWithRelations; showHeading?: boolean }) {
  const reportElementId = `qc-report-${run.id}`;
  const summaryBadge =
    run.summaryPass === true
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

  const [issueStates, setIssueStates] = useState<Record<string, IssueState>>(() => buildIssueStateMap(run));
  const [issueFilter, setIssueFilter] = useState<IssueFilter>("all");
  const [savingChecks, setSavingChecks] = useState<Record<string, boolean>>({});
  const [feedbackModalCheckId, setFeedbackModalCheckId] = useState<string | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");

  const [generalFeedback, setGeneralFeedback] = useState<string>(run.auditFeedback?.feedback ?? "");
  const [generalSaving, setGeneralSaving] = useState(false);
  const [generalStatus, setGeneralStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    setIssueStates(buildIssueStateMap(run));
  }, [run]);

  useEffect(() => {
    setGeneralFeedback(run.auditFeedback?.feedback ?? "");
    setGeneralStatus("idle");
  }, [run]);

  useEffect(() => {
    if (!feedbackModalCheckId) {
      return;
    }
    const existing = issueStates[feedbackModalCheckId]?.feedback ?? "";
    setFeedbackDraft(existing);
    setFeedbackError(null);
  }, [feedbackModalCheckId, issueStates]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }
    const timer = window.setTimeout(() => setStatusMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  const statusCounts = useMemo(() => {
    return run.checks.reduce(
      (acc, check) => {
        const status = issueStates[check.id]?.status ?? "open";
        acc[status] += 1;
        return acc;
      },
      { open: 0, resolved: 0, unwanted: 0 } as Record<IssueStatus, number>,
    );
  }, [issueStates, run]);

  const isSavingCheck = useCallback(
    (checkId: string) => Boolean(savingChecks[checkId]),
    [savingChecks],
  );

  const updateIssueStateOnClient = useCallback((checkId: string, updates: IssueState) => {
    setIssueStates((previous) => ({
      ...previous,
      [checkId]: updates,
    }));
  }, []);

  const updateIssueStatus = useCallback(
    async (checkId: string, status: IssueStatus, feedback?: string | null) => {
      setSavingChecks((previous) => ({ ...previous, [checkId]: true }));
      setStatusMessage(null);
      let success = false;

      try {
        const response = await fetch(`/api/qc-runs/${run.id}/issues/${checkId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, feedback }),
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as {
          feedback: { status: IssueStatus; feedback: string | null } | null;
        };

        const record = payload.feedback;
        updateIssueStateOnClient(checkId, {
          status: record?.status ?? "open",
          feedback: record?.feedback ?? "",
        });

        setStatusTone("success");
        setStatusMessage(
          record?.status === "unwanted"
            ? "Marked as unwanted. Thanks for helping retrain the model."
            : record?.status === "resolved"
              ? "Issue marked as resolved."
              : "Issue re-opened.",
        );
        success = true;
      } catch (error) {
        console.error("Failed to update issue status", error);
        setStatusTone("error");
        setStatusMessage("We couldn't update that issue. Please retry.");
      } finally {
        setSavingChecks((previous) => {
          const next = { ...previous };
          delete next[checkId];
          return next;
        });
      }

      return success;
    },
    [run.id, updateIssueStateOnClient],
  );

  const handleResolvedToggle = useCallback(
    (checkId: string, checked: boolean) => {
      const nextStatus: IssueStatus = checked ? "resolved" : "open";
      void updateIssueStatus(checkId, nextStatus);
    },
    [updateIssueStatus],
  );

  const handleReopen = useCallback(
    (checkId: string) => {
      void updateIssueStatus(checkId, "open");
    },
    [updateIssueStatus],
  );

  const openFeedbackModal = useCallback((checkId: string) => {
    setFeedbackModalCheckId(checkId);
    setFeedbackSubmitting(false);
  }, []);

  const closeFeedbackModal = useCallback(() => {
    if (feedbackSubmitting) {
      return;
    }
    setFeedbackModalCheckId(null);
  }, [feedbackSubmitting]);

  const submitFeedbackModal = useCallback(async () => {
    if (!feedbackModalCheckId) {
      return;
    }

    const trimmed = feedbackDraft.trim();
    if (trimmed.length < 5) {
      setFeedbackError("Tell us a bit more—minimum 5 characters.");
      return;
    }

    setFeedbackSubmitting(true);
    const success = await updateIssueStatus(feedbackModalCheckId, "unwanted", trimmed);
    setFeedbackSubmitting(false);
    if (success) {
      setFeedbackModalCheckId(null);
    }
  }, [feedbackDraft, feedbackModalCheckId, updateIssueStatus]);

  const markResolvedFromModal = useCallback(async () => {
    if (!feedbackModalCheckId) {
      return;
    }
    setFeedbackSubmitting(true);
    const success = await updateIssueStatus(feedbackModalCheckId, "resolved");
    setFeedbackSubmitting(false);
    if (success) {
      setFeedbackModalCheckId(null);
    }
  }, [feedbackModalCheckId, updateIssueStatus]);

  const saveGeneralFeedback = useCallback(async () => {
    setGeneralSaving(true);
    setGeneralStatus("idle");

    try {
      const response = await fetch(`/api/qc-runs/${run.id}/feedback`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: generalFeedback }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as {
        feedback: { feedback: string; updatedAt: string } | null;
      };

      setGeneralFeedback(payload.feedback?.feedback ?? "");
      setGeneralStatus("saved");
    } catch (error) {
      console.error("Failed to save audit feedback", error);
      setGeneralStatus("error");
    } finally {
      setGeneralSaving(false);
    }
  }, [generalFeedback, run.id]);

  const issueFilterMatches = useCallback(
    (checkId: string) => {
      if (issueFilter === "all") {
        return true;
      }
      const status = issueStates[checkId]?.status ?? "open";
      return status === issueFilter;
    },
    [issueFilter, issueStates],
  );

  const filteredChecksBySection = useMemo(() => {
    const mapping = new Map<string, typeof run.checks>();
    CHECK_SECTIONS.forEach((section) => {
      const checks = run.checks.filter(
        (check) => check.type === section.type && issueFilterMatches(check.id),
      );
      mapping.set(section.type, checks);
    });
    return mapping;
  }, [issueFilterMatches, run]);

  const filterActiveCount = useMemo(() => {
    if (issueFilter === "all") {
      return run.checks.length;
    }
    return run.checks.filter((check) => issueFilterMatches(check.id)).length;
  }, [issueFilter, issueFilterMatches, run]);

  const StatusMessageBanner = statusMessage ? (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        statusTone === "success"
          ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-800"
          : "border-rose-300/40 bg-rose-500/10 text-rose-700"
      }`}
    >
      {statusMessage}
    </div>
  ) : null;

  const copyDocSection = copyDocLinks.length > 0;

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

        <section className="space-y-6 rounded-3xl border border-slate-200/80 bg-slate-50/70 p-6">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Issue Resolution Tracker</h3>
              <p className="text-sm text-slate-600">
                Checkbox an issue once you verify it&apos;s resolved. Flag false positives with feedback to help admins retrain the model.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <IssueStatusBadge status="open" />
              <IssueStatusBadge status="resolved" />
              <IssueStatusBadge status="unwanted" />
            </div>
          </header>

          {StatusMessageBanner}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-center">
              <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Open</dt>
              <dd className="mt-2 text-2xl font-semibold text-slate-900">{statusCounts.open}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-center">
              <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Resolved</dt>
              <dd className="mt-2 text-2xl font-semibold text-slate-900">{statusCounts.resolved}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-center">
              <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Unwanted</dt>
              <dd className="mt-2 text-2xl font-semibold text-slate-900">{statusCounts.unwanted}</dd>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-slate-600">
              Showing <strong>{filterActiveCount}</strong> of {run.checks.length} checks
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {ISSUE_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setIssueFilter(option.value)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                    issueFilter === option.value
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {CHECK_SECTIONS.map((section) => {
          const checks = filteredChecksBySection.get(section.type) ?? [];
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
                  No checks match the current filter.
                </p>
              ) : (
                <ul className="space-y-4">
                  {checks.map((check) => {
                    const state = issueStates[check.id] ?? { status: "open", feedback: "" };
                    const disabled = isSavingCheck(check.id);
                    return (
                      <li
                        key={check.id}
                        className={`group relative overflow-hidden rounded-2xl border bg-white/85 p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-lg ${
                          state.status === "unwanted" ? "border-amber-400/60 bg-amber-50/80" : ""
                        }`}
                      >
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-400 via-sky-400 to-indigo-300 opacity-0 transition group-hover:opacity-100" />
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="flex gap-3">
                            <input
                              type="checkbox"
                              className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              checked={state.status === "resolved"}
                              onChange={(event) => handleResolvedToggle(check.id, event.target.checked)}
                              disabled={disabled}
                              aria-label={`Toggle resolved for ${check.name}`}
                            />
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
                          <IssueStatusBadge status={state.status} />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          <button
                            type="button"
                            onClick={() => openFeedbackModal(check.id)}
                            className="rounded-full border border-amber-400/60 bg-amber-500/10 px-3 py-1 text-amber-700 transition hover:bg-amber-500/20"
                            disabled={disabled}
                          >
                            {state.status === "unwanted" ? "Edit feedback" : "Mark as unwanted"}
                          </button>
                          {(state.status === "resolved" || state.status === "unwanted") && (
                            <button
                              type="button"
                              onClick={() => handleReopen(check.id)}
                              className="rounded-full border border-slate-300 px-3 py-1 text-slate-600 transition hover:bg-slate-100"
                              disabled={disabled}
                            >
                              Re-open
                            </button>
                          )}
                          {disabled ? <span className="text-indigo-500">Saving...</span> : null}
                        </div>

                        {state.status === "unwanted" && state.feedback ? (
                          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                            <span className="font-semibold uppercase tracking-[0.2em]">Reviewer note: </span>
                            <span className="whitespace-pre-wrap font-normal normal-case tracking-normal">{state.feedback}</span>
                          </div>
                        ) : null}

                        {check.details ? (
                          <pre className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-900/5 p-4 text-xs leading-relaxed text-slate-700">
                            {formatDetails(check.details)}
                          </pre>
                        ) : null}
                      </li>
                    );
                  })}
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
              <h3 className="text-xl font-semibold text-slate-900">QC Run Feedback</h3>
              <p className="text-sm text-slate-600">
                Share anything the model missed or additional guidance for the admin team.
              </p>
            </div>
            {generalStatus === "saved" ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Saved
              </span>
            ) : generalStatus === "error" ? (
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
                Save failed
              </span>
            ) : null}
          </header>
          <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm">
            <textarea
              className="min-h-[120px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Let admins know if anything is missing or incorrect in this audit."
              value={generalFeedback}
              onChange={(event) => {
                setGeneralFeedback(event.target.value);
                setGeneralStatus("idle");
              }}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Feedback is shared with admins to fine-tune detection rules and model prompts.
              </span>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void saveGeneralFeedback()}
                disabled={generalSaving}
              >
                {generalSaving ? "Saving…" : "Save feedback"}
              </button>
            </div>
          </div>
          {generalStatus === "error" ? (
            <p className="text-xs text-rose-600">We could not save your feedback. Please try again.</p>
          ) : null}
        </section>

        <section className="space-y-4">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Copy Document</h3>
              <p className="text-sm text-slate-600">Reference copy collected during the run.</p>
            </div>
            {copyDocSection ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {copyDocLinks.length} attachments
              </span>
            ) : null}
          </header>
          {copyDocSection ? (
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

      {feedbackModalCheckId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
          <div className="w-full max-w-xl space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <header className="space-y-2">
              <h4 className="text-xl font-semibold text-slate-900">Report unwanted issue</h4>
              <p className="text-sm text-slate-600">
                Tell admins why this flag is incorrect. Your note helps improve the model and future runs.
              </p>
            </header>
            <textarea
              className="min-h-[160px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Explain why this issue is a false positive or not relevant."
              value={feedbackDraft}
              onChange={(event) => setFeedbackDraft(event.target.value)}
              disabled={feedbackSubmitting}
            />
            {feedbackError ? <p className="text-xs text-rose-600">{feedbackError}</p> : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={closeFeedbackModal}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={feedbackSubmitting}
              >
                Cancel
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void markResolvedFromModal()}
                  className="inline-flex items-center justify-center rounded-full border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={feedbackSubmitting}
                >
                  Mark resolved instead
                </button>
                <button
                  type="button"
                  onClick={() => void submitFeedbackModal()}
                  className="inline-flex items-center justify-center rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={feedbackSubmitting}
                >
                  {feedbackSubmitting ? "Submitting…" : "Submit feedback"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
