import { Parser } from "json2csv";

import type {
  AuditFeedback,
  AuditIssueFeedback,
  CheckResult,
  LinkCheck,
  QcRun,
} from "@prisma/client";

export type RunWithRelations = QcRun & {
  checks: CheckResult[];
  links: LinkCheck[];
  issueFeedback: AuditIssueFeedback[];
  auditFeedback: AuditFeedback | null;
};

export function buildRunCsv(run: RunWithRelations): string {
  const rows: Array<Record<string, string>> = [];
  const emailTypeLabel = run.emailType
    ? run.emailType.charAt(0).toUpperCase() + run.emailType.slice(1)
    : "Marketing";

  rows.push(
    {
      section: "run",
      name: "Run ID",
      type: "summary",
      status: run.status,
      details: run.id,
    },
    {
      section: "run",
      name: "Silo",
      type: "summary",
      status: run.silo,
      details: run.entity,
    },
    {
      section: "run",
      name: "Email type",
      type: "summary",
      status: emailTypeLabel,
      details: run.emailType ?? "",
    },
    {
      section: "run",
      name: "Model",
      type: "summary",
      status: run.modelVersion || "unknown",
      details: run.summaryPass === null || run.summaryPass === undefined ? "unknown" : run.summaryPass ? "pass" : "fail",
    },
  );

  const feedbackMap = new Map(run.issueFeedback.map((entry) => [entry.checkId, entry]));

  run.checks.forEach((check) => {
    const feedback = feedbackMap.get(check.id);
    rows.push({
      section: "check",
      name: check.name,
      type: check.type,
      status: check.pass ? "pass" : "fail",
      details: JSON.stringify({
        checkDetails: check.details ?? null,
        resolution: feedback?.status ?? "open",
        reviewerFeedback: feedback?.feedback ?? null,
      }),
    });
  });

  run.links.forEach((link) => {
    rows.push({
      section: "link",
      name: link.url,
      type: link.finalUrl ?? "",
      status: link.ok === undefined || link.ok === null ? "unknown" : link.ok ? "pass" : "fail",
      details: JSON.stringify({
        statusCode: link.statusCode,
        redirected: link.redirected,
        finalUrl: link.finalUrl,
        notes: link.notes,
      }),
    });
  });

  const parser = new Parser({ fields: ["section", "name", "type", "status", "details"] });
  return parser.parse(rows);
}
