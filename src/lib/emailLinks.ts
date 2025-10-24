export function mergeEmailLinks(primary: string[], secondary: string[]): string[] {
  const unique = new Set<string>();

  const add = (value: string) => {
    if (typeof value !== "string") {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    unique.add(trimmed);
  };

  primary.forEach(add);
  secondary.forEach(add);

  return Array.from(unique);
}

export function normaliseLinkArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry): entry is string => entry.length > 0);
}
