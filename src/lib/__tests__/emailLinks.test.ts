import { mergeEmailLinks, normaliseLinkArray } from "@/lib/emailLinks";

describe("mergeEmailLinks", () => {
  it("deduplicates links across primary and secondary sources", () => {
    const result = mergeEmailLinks(
      [" https://example.com/landing ", "https://foo.com"],
      ["https://foo.com", "https://bar.com/path"]
    );

    expect(result).toEqual([
      "https://example.com/landing",
      "https://foo.com",
      "https://bar.com/path",
    ]);
  });

  it("filters out empty or non-string entries", () => {
    const result = mergeEmailLinks(["", "  "], ["https://valid.com", 12 as unknown as string]);

    expect(result).toEqual(["https://valid.com"]);
  });
});

describe("normaliseLinkArray", () => {
  it("returns trimmed string values from an array-like payload", () => {
    const input = [" https://one.com ", 42, null, "https://two.com"] as unknown[];
    expect(normaliseLinkArray(input)).toEqual(["https://one.com", "https://two.com"]);
  });

  it("returns an empty array for non-array inputs", () => {
    expect(normaliseLinkArray(undefined)).toEqual([]);
    expect(normaliseLinkArray({})).toEqual([]);
  });
});
