"use client";

import { useState } from "react";

import { generatePdfFromElement } from "@/lib/exportPdf";

interface Props {
  runId: string;
  targetElementId: string;
}

export function ReportDownloadControls({ runId, targetElementId }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePdfDownload = async () => {
    const element = document.getElementById(targetElementId);
    if (!element) {
      setError("Unable to find report element.");
      return;
    }

    setError(null);
    setDownloading(true);
    try {
      await generatePdfFromElement(element, `qc-run-${runId}.pdf`);
    } catch (err) {
      setError((err as Error).message || "Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <div className="flex flex-wrap items-center gap-3">
        <a
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
          href={`/api/qc-runs/${runId}/export.csv`}
        >
          Download CSV
        </a>
        <button
          type="button"
          onClick={handlePdfDownload}
          disabled={downloading}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {downloading ? "Rendering PDF…" : "Download PDF"}
        </button>
        <a
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
          href={`/api/qc-runs/${runId}/export.pdf`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View HTML
        </a>
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
