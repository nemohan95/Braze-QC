"use client";

import { Prisma } from "@prisma/client";
import Link from "next/link";
import { useEffect, useState, use } from "react";

import { RunCard } from "@/components/RunCard";
import { ENTITY_OPTIONS, SILO_OPTIONS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

interface QcIndexPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function normaliseDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
}

function extractSearchParam(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

function toDateInput(value?: string): string {
  if (!value) {
    return "";
  }
  return value.split("T")[0];
}

export default function QcIndexPage({ searchParams }: QcIndexPageProps) {
  const [runs, setRuns] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const resolvedSearchParams = use(searchParams);
  const silo = extractSearchParam(resolvedSearchParams?.silo);
  const entity = extractSearchParam(resolvedSearchParams?.entity);
  const from = extractSearchParam(resolvedSearchParams?.from);
  const to = extractSearchParam(resolvedSearchParams?.to);

  const startedAt: Prisma.DateTimeFilter = {};
  const fromIso = normaliseDate(from);
  const toIso = normaliseDate(to);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (silo) params.append("silo", silo);
      if (entity) params.append("entity", entity);
      if (from) params.append("from", from);
      if (to) params.append("to", to);

      const response = await fetch(`/api/qc-runs?${params.toString()}`);
      const data = await response.json();
      setRuns(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch (error) {
      console.error("Failed to load runs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, [silo, entity, from, to]);

  const handleRename = async (id: string, newName: string) => {
    const response = await fetch(`/api/qc-runs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to rename");
    }

    setRuns(prev => prev.map(run =>
      run.id === id ? { ...run, name: newName } : run
    ));
  };

  const completedRuns = runs.filter((run) => run.status === "completed");
  const passCount = completedRuns.filter((run) => run.summaryPass === true).length;
  const failCount = completedRuns.filter((run) => run.summaryPass === false).length;
  const passRate = completedRuns.length > 0 ? Math.round((passCount / completedRuns.length) * 100) : null;
  const activeRuns = runs.filter((run) => run.status !== "completed" && run.status !== "failed").length;

  return (
    <section className="space-y-10">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 text-slate-100 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.25),_transparent_55%)]" />
        <div className="relative flex flex-col gap-6 p-8 md:flex-row md:items-end md:justify-between md:p-10">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full bg-slate-800/60 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-300">
              Quality Control Dashboard
            </span>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">QC Runs</h1>
              <p className="max-w-2xl text-sm text-slate-300 md:text-base">
                Monitor active validations, fast-track failed runs, and surface the most recent reports. Use the filters below to zero in on the entities and timeframes you care about.
              </p>
            </div>
          </div>
          <Link
            href="/qc/new"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-indigo-500/30 transition hover:from-indigo-300 hover:via-sky-300 hover:to-indigo-400"
          >
            Launch New QC Run
          </Link>
        </div>
        <dl className="relative grid gap-4 border-t border-white/10 bg-white/5 px-8 py-6 text-sm backdrop-blur md:grid-cols-4 md:px-10">
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-widest text-slate-300">Runs in view</dt>
            <dd className="text-2xl font-semibold text-white">{runs.length}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-widest text-slate-300">Active pipelines</dt>
            <dd className="text-2xl font-semibold text-white">{activeRuns}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-widest text-slate-300">Completed pass rate</dt>
            <dd className="text-2xl font-semibold text-white">
              {passRate === null ? "--" : `${passRate}%`}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-widest text-slate-300">Passed vs failed</dt>
            <dd className="text-2xl font-semibold text-white">{passCount} / {failCount}</dd>
          </div>
        </dl>
      </div>

      <form
        className="grid gap-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-200/60 backdrop-blur md:grid-cols-4 md:p-8"
        method="get"
      >
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Silo
          <select
            defaultValue={silo ?? ""}
            name="silo"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">All</option>
            {SILO_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Entity
          <select
            defaultValue={entity ?? ""}
            name="entity"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">All</option>
            {ENTITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          From
          <input
            type="date"
            name="from"
            defaultValue={toDateInput(fromIso)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          To
          <input
            type="date"
            name="to"
            defaultValue={toDateInput(toIso)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </label>
        <div className="md:col-span-4 flex flex-wrap items-center gap-3 pt-2 text-sm">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-400 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-400 hover:via-sky-400 hover:to-indigo-300"
          >
            Apply Filters
          </button>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100"
            href="/qc"
          >
            Reset
          </Link>
          <span className="ml-auto text-xs font-medium uppercase tracking-widest text-slate-400">
            {total} total runs indexed
          </span>
        </div>
      </form>

      {runs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-12 text-center text-sm text-slate-500 shadow-inner">
          No QC runs found for the selected filters. Adjust the parameters or launch a fresh run to populate the list.
        </div>
      ) : (
        <ul className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {runs.map((run) => (
            <RunCard key={run.id} run={run} onRename={handleRename} />
          ))}
        </ul>
      )}
    </section>
  );
}
