"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RuleCounts {
  riskRules: number;
  keywordRules: number;
  additionalRules: number;
}

interface Props {
  initialCounts: RuleCounts;
}

export function RulesImportForm({ initialCounts }: Props) {
  const router = useRouter();
  const [counts, setCounts] = useState(initialCounts);
  const [files, setFiles] = useState<Partial<Record<keyof RuleCounts, File>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RuleCounts | null>(null);

  useEffect(() => {
    setCounts(initialCounts);
  }, [initialCounts]);

  const handleFileChange = (
    key: keyof RuleCounts,
  ) => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFiles((prev) => ({ ...prev, [key]: file ?? undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSummary(null);

    const formData = new FormData();
    (Object.keys(files) as Array<keyof RuleCounts>).forEach((key) => {
      const file = files[key];
      if (file) {
        formData.append(key, file);
      }
    });

    if ([...formData.keys()].length === 0) {
      setError("Select at least one CSV file to import.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/rules/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to import rules");
      }

      const payload = (await response.json()) as { summary?: RuleCounts };
      setSummary(payload.summary ?? null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200";
  const primaryButtonClasses =
    "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-400 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-400/30 transition hover:from-indigo-400 hover:via-sky-400 hover:to-indigo-300 disabled:cursor-not-allowed disabled:from-indigo-300 disabled:via-sky-300 disabled:to-indigo-200";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/70"
    >
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Import Rule CSVs</h2>
        <p className="text-sm text-slate-600">
          Upload updated CSV matrices to refresh the risk, keyword, and additional rule datasets.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Risk rules CSV
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange("riskRules")}
            className={inputClasses}
          />
          <span className="text-xs text-slate-500">Columns: entity, variant, siloFilter, text, version, active</span>
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Keyword rules CSV
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange("keywordRules")}
            className={inputClasses}
          />
          <span className="text-xs text-slate-500">Columns: keyword, requiredText, active</span>
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Additional rules CSV
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange("additionalRules")}
            className={inputClasses}
          />
          <span className="text-xs text-slate-500">Columns: topic, silo, entity, text, links, notes, version, active</span>
        </label>
      </div>

      {error ? (
        <p className="rounded-2xl border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-sm text-rose-600">{error}</p>
      ) : null}
      {summary ? (
        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
          Imported {summary.riskRules} risk, {summary.keywordRules} keyword, {summary.additionalRules} additional rules.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button type="submit" disabled={loading} className={primaryButtonClasses}>
          {loading ? "Importing..." : "Import CSVs"}
        </button>
        <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
          Templates live under <code>data/*.csv</code> in the repo.
        </span>
      </div>

      <dl className="grid gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 text-sm text-slate-600 md:grid-cols-3">
        <div className="space-y-1">
          <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Risk rules</dt>
          <dd className="text-base font-semibold text-slate-800">{counts.riskRules}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Keyword rules</dt>
          <dd className="text-base font-semibold text-slate-800">{counts.keywordRules}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Additional rules</dt>
          <dd className="text-base font-semibold text-slate-800">{counts.additionalRules}</dd>
        </div>
      </dl>
    </form>
  );
}
