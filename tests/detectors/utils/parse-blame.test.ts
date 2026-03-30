import { describe, it, expect } from "vitest";
import { parseBlameOutput } from "../../../src/detectors/utils/parse-blame";

describe("parseBlameOutput", () => {
  it("parses porcelain blame into author line counts", () => {
    const raw = [
      "abc123 1 1 1",
      "author Alice",
      "author-mail <alice@test.com>",
      "author-time 1234567890",
      "author-tz +0000",
      "committer Alice",
      "committer-mail <alice@test.com>",
      "committer-time 1234567890",
      "committer-tz +0000",
      "summary initial commit",
      "filename foo.ts",
      "\tconst x = 1;",
      "def456 2 2 1",
      "author Bob",
      "author-mail <bob@test.com>",
      "author-time 1234567891",
      "author-tz +0000",
      "committer Bob",
      "committer-mail <bob@test.com>",
      "committer-time 1234567891",
      "committer-tz +0000",
      "summary second commit",
      "filename foo.ts",
      "\tconst y = 2;",
      "ghi789 3 3 1",
      "author Alice",
      "author-mail <alice@test.com>",
      "author-time 1234567892",
      "author-tz +0000",
      "committer Alice",
      "committer-mail <alice@test.com>",
      "committer-time 1234567892",
      "committer-tz +0000",
      "summary third commit",
      "filename foo.ts",
      "\tconst z = 3;",
    ].join("\n");

    const result = parseBlameOutput(raw);

    expect(result).toBeInstanceOf(Map);
    expect(result.get("Alice")).toBe(2);
    expect(result.get("Bob")).toBe(1);
    expect(result.size).toBe(2);
  });

  it("returns empty map for empty string", () => {
    expect(parseBlameOutput("").size).toBe(0);
  });

  it("returns empty map for whitespace-only input", () => {
    expect(parseBlameOutput("   \n\n  ").size).toBe(0);
  });

  it("ignores 'Not Committed Yet' entries", () => {
    const raw = [
      "0000000000000000000000000000000000000000 1 1 1",
      "author Not Committed Yet",
      "author-mail <not.committed.yet>",
      "author-time 1234567890",
      "author-tz +0000",
      "committer Not Committed Yet",
      "committer-mail <not.committed.yet>",
      "committer-time 1234567890",
      "committer-tz +0000",
      "summary uncommitted",
      "filename foo.ts",
      "\tuncommitted line",
    ].join("\n");

    const result = parseBlameOutput(raw);
    expect(result.size).toBe(0);
  });

  it("handles multiple lines by same author", () => {
    const raw = [
      "aaa111 1 1 1",
      "author Solo",
      "author-mail <solo@test.com>",
      "author-time 1234567890",
      "author-tz +0000",
      "summary commit",
      "filename bar.ts",
      "\tline1",
      "aaa111 2 2 1",
      "author Solo",
      "author-mail <solo@test.com>",
      "author-time 1234567890",
      "author-tz +0000",
      "summary commit",
      "filename bar.ts",
      "\tline2",
      "aaa111 3 3 1",
      "author Solo",
      "author-mail <solo@test.com>",
      "author-time 1234567890",
      "author-tz +0000",
      "summary commit",
      "filename bar.ts",
      "\tline3",
    ].join("\n");

    const result = parseBlameOutput(raw);
    expect(result.size).toBe(1);
    expect(result.get("Solo")).toBe(3);
  });

  it("handles author names with spaces", () => {
    const raw = [
      "abc123 1 1 1",
      "author John Michael Doe",
      "author-mail <jmd@test.com>",
      "author-time 1234567890",
      "author-tz +0000",
      "summary commit",
      "filename baz.ts",
      "\tcode",
    ].join("\n");

    const result = parseBlameOutput(raw);
    expect(result.get("John Michael Doe")).toBe(1);
  });
});
