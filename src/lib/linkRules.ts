import type { LinkRule } from "@prisma/client";

import type { CopyDocLink } from "@/lib/copyDoc";

export type LinkMatchType = "contains" | "starts_with" | "ends_with" | "exact";

interface EvaluateLinkRulesParams {
  rules: LinkRule[];
  emailLinks: string[];
}

interface LinkRequirementMatch {
  ruleId: string;
  kind: string;
  hrefPattern: string;
  matchType: LinkMatchType;
  matchedUrl: string;
}

interface LinkRequirementMiss {
  ruleId: string;
  kind: string;
  hrefPattern: string;
  matchType: LinkMatchType;
}

export interface LinkRequirementResult {
  matched: LinkRequirementMatch[];
  missing: LinkRequirementMiss[];
}

interface EvaluateCopyDocLinksParams {
  copyDocLinks: CopyDocLink[];
  emailLinks: string[];
}

interface CopyDocLinkCoverageMatch {
  href: string;
  label: string;
  matchedUrl: string;
}

interface NormalisedHref {
  base: string;
  withSearch: string;
}

export interface CopyDocLinkCoverageResult {
  matched: CopyDocLinkCoverageMatch[];
  missing: CopyDocLink[];
}

function normaliseHref(value: string): NormalisedHref | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    const rawPath = parsed.pathname.replace(/\/+$/, "");
    const path = rawPath || "/";
    const base = `${parsed.protocol}//${parsed.host}${path}`.toLowerCase();
    const search = parsed.search ? parsed.search.toLowerCase() : "";
    return {
      base,
      withSearch: `${base}${search}`,
    };
  } catch {
    const withoutHash = (trimmed.split("#")[0] ?? "").trim();
    const [pathPart = "", searchPart] = withoutHash.split("?");
    const rawPath = pathPart.replace(/\/+$/, "");
    const path = rawPath || (trimmed.startsWith("/") ? "/" : rawPath);
    const base = path.toLowerCase();
    const search = searchPart ? `?${searchPart.toLowerCase()}` : "";
    if (!base && !search) {
      return null;
    }
    return {
      base,
      withSearch: `${base}${search}`,
    };
  }
}

function matchesPattern(url: string, pattern: string, matchType: LinkMatchType): boolean {
  const value = url.toLowerCase();
  const matcher = pattern.toLowerCase();

  switch (matchType) {
    case "starts_with":
      return value.startsWith(matcher);
    case "ends_with":
      return value.endsWith(matcher);
    case "exact":
      return value === matcher;
    case "contains":
    default:
      return value.includes(matcher);
  }
}

export function evaluateLinkRules({ rules, emailLinks }: EvaluateLinkRulesParams): LinkRequirementResult {
  const cleanedLinks = emailLinks.map((href) => href.trim()).filter(Boolean);
  const matches: LinkRequirementMatch[] = [];
  const missing: LinkRequirementMiss[] = [];

  rules
    .filter((rule) => rule.active)
    .forEach((rule) => {
      const matchType = (rule.matchType as LinkMatchType) || "contains";
      const pattern = rule.hrefPattern.trim();
      if (!pattern) {
        return;
      }

      const matchedUrl = cleanedLinks.find((link) => matchesPattern(link, pattern, matchType));
      if (matchedUrl) {
        matches.push({
          ruleId: rule.id,
          kind: rule.kind,
          hrefPattern: pattern,
          matchType,
          matchedUrl,
        });
      } else {
        missing.push({
          ruleId: rule.id,
          kind: rule.kind,
          hrefPattern: pattern,
          matchType,
        });
      }
    });

  return { matched: matches, missing };
}

export function evaluateCopyDocLinkCoverage({
  copyDocLinks,
  emailLinks,
}: EvaluateCopyDocLinksParams): CopyDocLinkCoverageResult {
  if (copyDocLinks.length === 0) {
    return { matched: [], missing: [] };
  }

  const emailMap = new Map<string, string>();
  emailLinks.forEach((href) => {
    const normalised = normaliseHref(href);
    if (!normalised) {
      return;
    }

    const insert = (key: string) => {
      if (key && !emailMap.has(key)) {
        emailMap.set(key, href);
      }
    };

    insert(normalised.withSearch);
    insert(normalised.base);
  });

  const matched: CopyDocLinkCoverageMatch[] = [];
  const missing: CopyDocLink[] = [];

  copyDocLinks.forEach((link) => {
    const normalised = normaliseHref(link.href);
    if (!normalised) {
      return;
    }
    const emailHref = emailMap.get(normalised.withSearch) ?? emailMap.get(normalised.base);
    if (emailHref) {
      matched.push({ href: link.href, label: link.label, matchedUrl: emailHref });
    } else {
      missing.push(link);
    }
  });

  return { matched, missing };
}
