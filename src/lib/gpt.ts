import OpenAI from "openai";

import type { EmailType } from "@/lib/constants";

export interface KeywordRulePayload {
  keyword: string;
  requiredText: string;
}

export interface AdditionalRulePayload {
  topic: string;
  silo: string;
  entity: string;
  text: string;
  links?: unknown;
  notes?: string | null;
  version?: string;
}

export interface QcModelInput {
  silo: string;
  entity: string;
  emailType: EmailType;
  riskRules: string[];
  disclaimerRules: string[];
  keywordRules: KeywordRulePayload[];
  additionalRules: AdditionalRulePayload[];
  brazePreviewUrl: string;
  emailContent: {
    subject?: string | null;
    preheader?: string | null;
    bodyParagraphs: string[];
    ctas: Array<{ label: string; href: string }>;
  };
  rawEmailHtml: string;
  copyDocText: string;
}

export type CheckResultType =
  | "content_mismatch"
  | "subject_preheader"
  | "disclaimer"
  | "keyword_disclaimer"
  | "system_notice"
  | "fetch_failure";

export interface QcModelOutputCheck {
  type: CheckResultType;
  name: string;
  pass: boolean;
  details?: unknown;
}

export interface QcModelOutput {
  summary_pass: boolean;
  model_version: string;
  checks: QcModelOutputCheck[];
}

const QC_RESPONSE_SCHEMA = {
  name: "qc_run_report",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary_pass: { type: "boolean" },
      model_version: { type: "string" },
      checks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: {
              type: "string",
              enum: [
                "content_mismatch",
                "subject_preheader",
                "disclaimer",
                "keyword_disclaimer",
              ],
            },
            name: { type: "string" },
            pass: { type: "boolean" },
            // Allow any JSON value for details to align with Prisma Json field
            // The Responses API requires objects in union to set additionalProperties: false
            details: {
              anyOf: [
                { type: "null" },
                { type: "string" },
                { type: "number" },
                { type: "boolean" },
                {
                  type: "array",
                  items: {
                    anyOf: [
                      { type: "string" },
                      { type: "number" },
                      { type: "boolean" },
                      { type: "null" },
                      {
                        type: "array",
                        items: {
                          anyOf: [
                            { type: "string" },
                            { type: "number" },
                            { type: "boolean" },
                            { type: "null" },
                          ]
                        }
                      },
                      {
                        type: "object",
                        additionalProperties: false,
                        required: []
                      },
                    ],
                  },
                },
                {
                  type: "object",
                  additionalProperties: false,
                  required: []
                },
              ],
            },
          },
          required: ["type", "name", "pass", "details"],
        },
      },
    },
    required: ["summary_pass", "model_version", "checks"],
  },
  strict: true,
  type: "json_schema",
} as const;

let cachedClient: OpenAI | null = null;

export function isQcModelMockEnabled(): boolean {
  return (process.env.QC_MODEL_MODE || "").toLowerCase() === "mock" || !process.env.OPENAI_API_KEY;
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey });
  }

  return cachedClient;
}

function buildMockChecks(input: QcModelInput): QcModelOutput {
  return {
    summary_pass: true,
    model_version: "mock-v1",
    checks: [
      {
        type: "system_notice",
        name: "Mock QC run",
        pass: true,
        details:
          "QC model executed in mock mode because OPENAI_API_KEY is not configured or QC_MODEL_MODE=mock is set.",
      },
      {
        type: "disclaimer",
        name: "Disclaimers collected",
        pass: input.disclaimerRules.length > 0,
        details: `Disclaimers provided: ${input.disclaimerRules.length}`,
      },
    ],
  } satisfies QcModelOutput;
}

export async function runQcModel(input: QcModelInput): Promise<QcModelOutput> {
  if (isQcModelMockEnabled()) {
    return buildMockChecks(input);
  }

  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content:
          "You are an expert marketing email QC assistant. Compare Braze previews with approved copy documents and compliance rules. Always return only JSON that conforms to the provided response schema. If any requirement cannot be verified, mark the related check as failed and explain why.",
      },
      {
        role: "user",
        content: JSON.stringify({
          instructions: [
            "Use the Braze preview HTML and parsed summary together; the HTML is the source of truth when there is disagreement.",
            "Compare all content, subject, preheader, CTAs, disclaimers, and keywords against the copy document and compliance rules.",
            "Give each check a clear pass/fail. When failing, cite concise evidence pulled from either the email or the copy doc.",
            "If required information is missing or ambiguous, treat the check as failed and explain the gap.",
          ],
          context: {
            braze_preview_url: input.brazePreviewUrl,
            silo: input.silo,
            entity: input.entity,
            email_type: input.emailType,
            risk_rules: input.riskRules,
            disclaimer_rules: input.disclaimerRules,
            keyword_rules: input.keywordRules,
            additional_rules: input.additionalRules,
          },
          email_sources: {
            parsed_summary: input.emailContent,
            raw_html: input.rawEmailHtml,
          },
          copy_document_text: input.copyDocText,
          output_expectations: [
            "Produce JSON that matches the provided schema exactly (see response_format).",
            "Use descriptive names for checks so humans understand the issues quickly.",
          ],
        }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "qc_run_report",
        schema: QC_RESPONSE_SCHEMA.schema,
        strict: true,
      },
    },
    max_tokens: 2000,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI response did not include content");
  }

  try {
    return JSON.parse(content) as QcModelOutput;
  } catch (error) {
    throw new Error(`Failed to parse model output: ${(error as Error).message}`);
  }
}
