import * as cheerio from "cheerio";

export interface ParsedEmailCta {
  label: string;
  href: string;
}

export interface ParsedEmailResult {
  subject?: string | null;
  preheader?: string | null;
  bodyParagraphs: string[];
  ctas: ParsedEmailCta[];
  links: string[];
}

function normaliseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractSubject($: cheerio.CheerioAPI): string | null {
  const metaSubject =
    $("meta[name='subject']").attr("content") ||
    $("meta[name='og:title']").attr("content") ||
    $("meta[property='og:title']").attr("content");

  if (metaSubject) {
    const cleaned = normaliseWhitespace(metaSubject);
    if (cleaned) {
      return cleaned;
    }
  }

  const title = $("title").first().text();
  return title ? normaliseWhitespace(title) : null;
}

function extractPreheader($: cheerio.CheerioAPI): string | null {
  const explicit = $("meta[name='preheader'], meta[name='preview_text']").attr("content");
  if (explicit) {
    const cleaned = normaliseWhitespace(explicit);
    if (cleaned) {
      return cleaned;
    }
  }

  const hiddenCandidates = new Set<string>();
  $("body *[style]").each((_, element) => {
    const styleAttr = ($(element).attr("style") || "").toLowerCase();
    const isHidden = /display\s*:\s*none|opacity\s*:\s*0|visibility\s*:\s*hidden|max-height\s*:\s*0|font-size\s*:\s*1px/.test(styleAttr);
    if (isHidden) {
      const textContent = normaliseWhitespace($(element).text());
      if (textContent && textContent.length > 5 && textContent.length < 200) {
        hiddenCandidates.add(textContent);
      }
    }
  });

  return hiddenCandidates.values().next().value ?? null;
}

function extractBodyParagraphs($: cheerio.CheerioAPI): string[] {
  const paragraphs: string[] = [];
  const seen = new Set<string>();

  $("body")
    .find("p, li, td, span, div")
    .each((_, element) => {
      const $el = $(element);
      if ($el.find("p, li, td, span, div").length > 0 && !$el.is("p")) {
        // Skip containers that have nested blocks unless it's a paragraph.
        return;
      }

      const text = normaliseWhitespace($el.text());
      if (!text) {
        return;
      }

      if (text.length < 2) {
        return;
      }

      if (seen.has(text)) {
        return;
      }

      seen.add(text);
      paragraphs.push(text);
    });

  return paragraphs;
}

function extractCtas($: cheerio.CheerioAPI): ParsedEmailCta[] {
  const ctas: ParsedEmailCta[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = ($(element).attr("href") || "").trim();
    if (!href) {
      return;
    }

    const label = normaliseWhitespace($(element).text());
    if (!label) {
      return;
    }

    const key = `${label}::${href}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    ctas.push({ label, href });
  });

  return ctas;
}

function extractLinks($: cheerio.CheerioAPI): string[] {
  const ATTRIBUTE_PRIORITY = ["href", "data-href", "data-url", "data-saferedirecturl"] as const;
  const IGNORED_TAGS = new Set(["base", "link", "meta", "script", "style"]);
  const links = new Set<string>();

  const tryAddLink = (_: number, element: cheerio.Element) => {
    const $element = $(element);
    const tagName = String($element.prop("tagName") ?? "").toLowerCase();
    if (tagName && IGNORED_TAGS.has(tagName)) {
      return;
    }

    ATTRIBUTE_PRIORITY.forEach((attr) => {
      const rawValue = ($element.attr(attr) || "").trim();
      if (!rawValue) {
        return;
      }
      if (/^javascript:/i.test(rawValue)) {
        return;
      }
      links.add(rawValue);
    });
  };

  $("[href], [data-href], [data-url], [data-saferedirecturl]").each(tryAddLink);

  return Array.from(links);
}

function extractInlineMessageHtml(rawHtml: string): { html: string; subject?: string | null } | null {
  const marker = "window.__INITIAL_PROPS__";
  const markerIndex = rawHtml.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const jsonStart = rawHtml.indexOf("=", markerIndex);
  if (jsonStart === -1) {
    return null;
  }

  const scriptCloseIndex = rawHtml.indexOf("</script>", jsonStart);
  if (scriptCloseIndex === -1) {
    return null;
  }

  const jsonPayload = rawHtml
    .slice(jsonStart + 1, scriptCloseIndex)
    .trim()
    .replace(/;$/, "");

  if (!jsonPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonPayload) as {
      message?: { payload?: { body?: string; subject?: string | null } };
    };
    const inlineHtml = parsed?.message?.payload?.body;
    if (typeof inlineHtml === "string" && inlineHtml.trim()) {
      return {
        html: inlineHtml,
        subject: parsed.message?.payload?.subject ?? null,
      };
    }
  } catch {
    // Ignore malformed payloads and fall back to raw HTML parsing.
  }

  return null;
}

export function parseEmail(html: string): ParsedEmailResult {
  const inline = extractInlineMessageHtml(html);
  const htmlToParse = inline?.html ?? html;
  const $ = cheerio.load(htmlToParse);

  $("script, style, noscript, svg").remove();

  return {
    subject: inline?.subject ?? extractSubject($),
    preheader: extractPreheader($),
    bodyParagraphs: extractBodyParagraphs($),
    ctas: extractCtas($),
    links: extractLinks($),
  };
}
