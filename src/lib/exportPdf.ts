import type { RunWithRelations } from "@/lib/exportCsv";

function escapeHtml(value: string | number | boolean | null | undefined): string {
  const str = String(value ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildRunHtml(run: RunWithRelations): string {
  const runSummaryRows = [
    `<tr><th align="left">Run ID</th><td>${escapeHtml(run.id)}</td></tr>`,
    `<tr><th align="left">Status</th><td>${escapeHtml(run.status)}</td></tr>`,
    `<tr><th align="left">Silo</th><td>${escapeHtml(run.silo)}</td></tr>`,
    `<tr><th align="left">Entity</th><td>${escapeHtml(run.entity)}</td></tr>`,
    `<tr><th align="left">Model</th><td>${escapeHtml(run.modelVersion ?? "unknown")}</td></tr>`,
    `<tr><th align="left">Summary</th><td>${run.summaryPass === null || run.summaryPass === undefined ? "unknown" : run.summaryPass ? "Pass" : "Fail"}</td></tr>`,
  ].join("");

  const checkRows = run.checks
    .map(
      (check) =>
        `<tr><td>${escapeHtml(check.name)}</td><td>${escapeHtml(check.type)}</td><td>${check.pass ? "Pass" : "Fail"}</td><td>${
          check.details ? escapeHtml(JSON.stringify(check.details, null, 2)) : ""
        }</td></tr>`,
    )
    .join("");

  const linkRows = run.links
    .map(
      (link) =>
        `<tr><td>${escapeHtml(link.url)}</td><td>${link.statusCode ?? ""}</td><td>${
          link.ok === null || link.ok === undefined ? "unknown" : link.ok ? "Pass" : "Fail"
        }</td><td>${escapeHtml(link.finalUrl ?? "")}</td><td>${escapeHtml(link.notes ?? "")}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Email QC Report</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; color: #111827; }
      h1, h2 { color: #111827; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 14px; }
      th { background-color: #f3f4f6; text-align: left; }
    </style>
  </head>
  <body>
    <h1>Email QC Report</h1>
    <h2>Summary</h2>
    <table>${runSummaryRows}</table>
    <h2>Checks</h2>
    <table>
      <thead>
        <tr><th>Name</th><th>Type</th><th>Status</th><th>Details</th></tr>
      </thead>
      <tbody>${checkRows}</tbody>
    </table>
    <h2>Links</h2>
    <table>
      <thead>
        <tr><th>URL</th><th>Status</th><th>OK</th><th>Final URL</th><th>Notes</th></tr>
      </thead>
      <tbody>${linkRows}</tbody>
    </table>
  </body>
</html>`;
}

export async function generatePdfFromElement(element: HTMLElement, filename: string) {
  if (typeof window === "undefined") {
    throw new Error("generatePdfFromElement can only run in the browser");
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, { scale: 2 });
  const imageData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgProps = pdf.getImageProperties(imageData);
  const ratio = Math.min(pageWidth / imgProps.width, pageHeight / imgProps.height);
  const width = imgProps.width * ratio;
  const height = imgProps.height * ratio;
  const x = (pageWidth - width) / 2;
  const y = 40;

  pdf.addImage(imageData, "PNG", x, y, width, height);
  pdf.save(filename);
}
