import * as cheerio from "cheerio";

import type { CopyDocLink } from "@/lib/copyDoc";

export function extractCopyDocLinksFromHtml(html: string | null | undefined): CopyDocLink[] {
  if (!html) {
    return [];
  }

  const $ = cheerio.load(`<body>${html}</body>`);

  return $("a")
    .map((_, element) => {
      const href = ($(element).attr("href") || "").trim();
      if (!href) {
        return null;
      }
      const label = $(element).text().trim();
      return { href, label } satisfies CopyDocLink;
    })
    .get()
    .filter((item): item is CopyDocLink => Boolean(item));
}
