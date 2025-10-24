export const STAGE_SEQUENCE = [
  "queued",
  "fetching_preview",
  "parsing_preview",
  "loading_rules",
  "running_model",
  "checking_links",
  "saving_results",
  "completed",
] as const;

export type QcProgressStage = (typeof STAGE_SEQUENCE)[number] | "failed";

export interface StageMetadata {
  stage: QcProgressStage;
  label: string;
  description: string;
  prompt: string;
}

export const PROGRESS_STEPS: StageMetadata[] = [
  {
    stage: "queued",
    label: "Queued",
    description: "Hold tight—preparing to kick off this QC run.",
    prompt: "Take a quick scan of your copy doc while we line things up.",
  },
  {
    stage: "fetching_preview",
    label: "Capturing preview",
    description: "Fetching the Braze preview so we can inspect what actually shipped.",
    prompt: "Grab a sip of water—this only takes a moment.",
  },
  {
    stage: "parsing_preview",
    label: "Parsing email",
    description: "Breaking the HTML into subject, preheader, body copy, CTAs, and links.",
    prompt: "Skim your launch notes: anything new to watch for?",
  },
  {
    stage: "loading_rules",
    label: "Loading guardrails",
    description: "Pulling the latest risk, keyword, and disclaimer rules for this silo/entity combo.",
    prompt: "Think about recent compliance updates—did we miss any attachments?",
  },
  {
    stage: "running_model",
    label: "Comparing copy",
    description: "Letting the QC model line-by-line compare preview content against the approved copy doc.",
    prompt: "Mentally checklist the critical claims you expect to see.",
  },
  {
    stage: "checking_links",
    label: "Following links",
    description: "Testing every CTA for redirects, status codes, and domain matches.",
    prompt: "Picture where each CTA should end up—does it align?",
  },
  {
    stage: "saving_results",
    label: "Packaging report",
    description: "Compiling findings, screenshots, and artefacts so you can review everything in one place.",
    prompt: "Queue up your action doc so you can log feedback fast.",
  },
  {
    stage: "completed",
    label: "Ready for review",
    description: "QC run is complete. All checks, links, and notes are available below.",
    prompt: "Dive into the findings while the details are fresh.",
  },
  {
    stage: "failed",
    label: "Run failed",
    description: "Something prevented this QC run from finishing.",
    prompt: "Retry the run and double-check the preview URL and copy doc.",
  },
];

export const STAGE_METADATA = PROGRESS_STEPS.reduce<Record<QcProgressStage, StageMetadata>>((acc, item) => {
  acc[item.stage] = item;
  return acc;
}, {} as Record<QcProgressStage, StageMetadata>);

export function stageIndex(stage: QcProgressStage): number {
  const index = STAGE_SEQUENCE.indexOf(stage as (typeof STAGE_SEQUENCE)[number]);
  if (index === -1) {
    return stage === "failed" ? STAGE_SEQUENCE.length : 0;
  }
  return index;
}

export function stageProgress(stage: QcProgressStage, elapsedMs: number = 0): number {
  if (stage === "failed") {
    return 100;
  }
  if (stage === "completed") {
    return 100;
  }

  const index = stageIndex(stage);
  const total = STAGE_SEQUENCE.length - 1;
  if (total <= 0) {
    return 0;
  }

  const TOTAL_DURATION_MS = 30000; // 30 seconds
  const baseProgress = (index / total) * 80; // Use 80% for stage progress
  const timeProgress = Math.min(20, (elapsedMs / TOTAL_DURATION_MS) * 20); // Use remaining 20% for time

  return Math.min(100, Math.round(baseProgress + timeProgress));
}
