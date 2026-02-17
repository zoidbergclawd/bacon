import { describe, it, expect } from "vitest";
import {
  parseBlameOutput,
  calculateBusFactor,
  analyzeFile,
  getTrackedFiles,
  detect,
  type AuthorLineCount,
  type BusFactorReport,
} from "../BusFactorDetector";
import * as path from "path";

const REPO_ROOT = path.resolve(__dirname, "../../..");

describe("parseBlameOutput", () => {
  it("parses porcelain blame into author counts", () => {
    const output = [
      "abc123 1 1 1",
      "author Alice",
      "author-mail <alice@test.com>",
      "author-time 1234567890",
      "author-tz +0000",
      "\tline content",
      "def456 2 2 1",
      "author Bob",
      "author-mail <bob@test.com>",
      "author-time 1234567891",
      "author-tz +0000",
      "\tline content",
      "ghi789 3 3 1",
      "author Alice",
      "author-mail <alice@test.com>",
      "author-time 1234567892",
      "author-tz +0000",
      "\tline content",
    ].join("\n");

    const result = parseBlameOutput(output);

    expect(result.get("Alice")).toBe(2);
    expect(result.get("Bob")).toBe(1);
    expect(result.size).toBe(2);
  });

  it("returns empty map for empty output", () => {
    const result = parseBlameOutput("");
    expect(result.size).toBe(0);
  });

  it("ignores 'Not Committed Yet' entries", () => {
    const output = [
      "0000000 1 1 1",
      "author Not Committed Yet",
      "\tuncommitted line",
    ].join("\n");

    const result = parseBlameOutput(output);
    expect(result.size).toBe(0);
  });
});

describe("calculateBusFactor", () => {
  it("returns 1 for single author", () => {
    const authors: AuthorLineCount[] = [
      { author: "Alice", lines: 100, percentage: 100 },
    ];
    expect(calculateBusFactor(authors)).toBe(1);
  });

  it("returns 1 when one author dominates", () => {
    const authors: AuthorLineCount[] = [
      { author: "Alice", lines: 90, percentage: 90 },
      { author: "Bob", lines: 10, percentage: 10 },
    ];
    expect(calculateBusFactor(authors)).toBe(1);
  });

  it("returns 2 when two authors split evenly", () => {
    const authors: AuthorLineCount[] = [
      { author: "Alice", lines: 50, percentage: 50 },
      { author: "Bob", lines: 50, percentage: 50 },
    ];
    // First author = 50 lines, need > 50% of 100 = need > 50
    // Alice alone = 50, not > 50, so need Bob too
    expect(calculateBusFactor(authors)).toBe(2);
  });

  it("returns 0 for empty authors", () => {
    expect(calculateBusFactor([])).toBe(0);
  });

  it("returns 0 for authors with zero lines", () => {
    const authors: AuthorLineCount[] = [
      { author: "Alice", lines: 0, percentage: 0 },
    ];
    expect(calculateBusFactor(authors)).toBe(0);
  });

  it("returns correct bus factor for 3 authors", () => {
    const authors: AuthorLineCount[] = [
      { author: "Alice", lines: 40, percentage: 40 },
      { author: "Bob", lines: 35, percentage: 35 },
      { author: "Charlie", lines: 25, percentage: 25 },
    ];
    // Sorted: Alice(40), Bob(35), Charlie(25). Total=100.
    // Alice alone = 40, not > 50.
    // Alice + Bob = 75, > 50. Bus factor = 2.
    expect(calculateBusFactor(authors)).toBe(2);
  });
});

describe("analyzeFile (integration)", () => {
  it("analyzes a real file in this repo", () => {
    // Use AGENTS.md — has committed blame history (package.json may be uncommitted)
    const result = analyzeFile("AGENTS.md", REPO_ROOT, 80);

    expect(result).not.toBeNull();
    if (result) {
      expect(result.filePath).toBe("AGENTS.md");
      expect(result.totalLines).toBeGreaterThan(0);
      expect(result.authors.length).toBeGreaterThan(0);
      expect(result.busFactorScore).toBeGreaterThanOrEqual(1);
      expect(typeof result.flagged).toBe("boolean");

      // Percentages should sum to ~100
      const totalPct = result.authors.reduce((s, a) => s + a.percentage, 0);
      expect(totalPct).toBeCloseTo(100, 0);
    }
  });

  it("returns null for non-existent file", () => {
    const result = analyzeFile("nonexistent-file.xyz", REPO_ROOT, 80);
    expect(result).toBeNull();
  });
});

describe("getTrackedFiles (integration)", () => {
  it("returns tracked files in the repo", () => {
    const files = getTrackedFiles(REPO_ROOT);
    expect(files.length).toBeGreaterThan(0);
    expect(files).toContain("package.json");
  });

  it("filters by pattern", () => {
    const files = getTrackedFiles(REPO_ROOT, ["*.json"]);
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(f).toMatch(/\.json$/);
    }
  });
});

describe("detect (integration)", () => {
  it("produces a valid report for this repo", () => {
    const report = detect({
      repoPath: REPO_ROOT,
      filePatterns: ["*.json", "*.md"],
    });

    expect(report.repoPath).toBe(REPO_ROOT);
    expect(report.threshold).toBe(80);
    expect(report.files.length).toBeGreaterThan(0);
    expect(report.summary.totalFiles).toBe(report.files.length);
    expect(report.summary.overallBusFactor).toBeGreaterThanOrEqual(1);
    expect(typeof report.summary.flaggedFiles).toBe("number");
    expect(report.analyzedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("respects custom threshold", () => {
    const report = detect({
      repoPath: REPO_ROOT,
      threshold: 50,
      filePatterns: ["package.json"],
    });

    expect(report.threshold).toBe(50);
  });

  it("report is valid JSON-serializable", () => {
    const report = detect({
      repoPath: REPO_ROOT,
      filePatterns: ["package.json"],
    });

    const json = JSON.stringify(report);
    const parsed = JSON.parse(json) as BusFactorReport;

    expect(parsed.files).toHaveLength(report.files.length);
    expect(parsed.summary).toEqual(report.summary);
  });

  it("flags files where single author owns > threshold", () => {
    // With threshold 0, every file with at least one author should be flagged
    const report = detect({
      repoPath: REPO_ROOT,
      threshold: 0,
      filePatterns: ["package.json"],
    });

    for (const file of report.files) {
      expect(file.flagged).toBe(true);
    }
  });
});
