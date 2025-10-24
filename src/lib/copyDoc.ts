export interface CopyDocLink {
  href: string;
  label: string;
}

export interface CopyDocLinksPayload {
  html: string;
  text: string;
  links: CopyDocLink[];
}

export function normaliseCopyDocHtml(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normaliseCopyDocLinks(value: unknown): CopyDocLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      const href = typeof entry?.href === "string" ? entry.href.trim() : "";
      const label = typeof entry?.label === "string" ? entry.label.trim() : "";
      if (!href) {
        return null;
      }
      return { href, label } satisfies CopyDocLink;
    })
    .filter((item): item is CopyDocLink => Boolean(item));
}
