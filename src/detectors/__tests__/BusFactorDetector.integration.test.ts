import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "child_process";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { BusFactorDetector } from "../BusFactorDetector";
import type { DetectorContext, DetectorFinding } from "../types";

/**
 * Integration test: spins up a real git repo with known commit history,
 * runs BusFactorDetector end-to-end, and verifies flagging behavior.
 */
describe("BusFactorDetector integration (real git repo)", () => {
  let repoDir: string;

  function git(args: string[], env?: Record<string, string>) {
    execFileSync("git", args, {
      cwd: repoDir,
      encoding: "utf-8",
      env: { ...process.env, ...env },
    });
  }

  function commitAs(name: string, email: string, message: string) {
    git(["commit", "-m", message], {
      GIT_AUTHOR_NAME: name,
      GIT_AUTHOR_EMAIL: email,
      GIT_COMMITTER_NAME: name,
      GIT_COMMITTER_EMAIL: email,
    });
  }

  beforeAll(() => {
    repoDir = mkdtempSync(join(tmpdir(), "bus-factor-test-"));

    git(["init"]);
    git(["config", "user.name", "Setup"]);
    git(["config", "user.email", "setup@test.com"]);

    // --- risky.ts: 100% owned by Alice (bus factor = 1, should be flagged) ---
    writeFileSync(
      join(repoDir, "risky.ts"),
      [
        "export function dangerZone() {",
        "  return 'only Alice knows this';",
        "  // critical business logic",
        "  // that nobody else understands",
        "  // because Alice wrote it all",
        "}",
      ].join("\n")
    );
    git(["add", "risky.ts"]);
    commitAs("Alice", "alice@test.com", "Alice writes risky.ts");

    // --- healthy.ts: balanced across 3 authors (bus factor > 1, should NOT be flagged at 80%) ---
    // Each author contributes roughly equal lines via separate commits.

    // Alice writes initial lines
    writeFileSync(
      join(repoDir, "healthy.ts"),
      [
        "export function teamWork() {",
        "  // Alice's contribution",
        "  const a = 1;",
        "  const b = 2;",
      ].join("\n")
    );
    git(["add", "healthy.ts"]);
    commitAs("Alice", "alice@test.com", "Alice starts healthy.ts");

    // Bob adds lines
    writeFileSync(
      join(repoDir, "healthy.ts"),
      [
        "export function teamWork() {",
        "  // Alice's contribution",
        "  const a = 1;",
        "  const b = 2;",
        "  // Bob's contribution",
        "  const c = 3;",
        "  const d = 4;",
      ].join("\n")
    );
    git(["add", "healthy.ts"]);
    commitAs("Bob", "bob@test.com", "Bob extends healthy.ts");

    // Charlie adds lines
    writeFileSync(
      join(repoDir, "healthy.ts"),
      [
        "export function teamWork() {",
        "  // Alice's contribution",
        "  const a = 1;",
        "  const b = 2;",
        "  // Bob's contribution",
        "  const c = 3;",
        "  const d = 4;",
        "  // Charlie's contribution",
        "  const e = 5;",
        "  const f = 6;",
        "}",
      ].join("\n")
    );
    git(["add", "healthy.ts"]);
    commitAs("Charlie", "charlie@test.com", "Charlie extends healthy.ts");
  });

  afterAll(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it("flags risky single-author file", async () => {
    const detector = new BusFactorDetector();
    const context: DetectorContext = {
      projectRoot: repoDir,
      options: { threshold: 80, filePatterns: ["risky.ts"] },
    };

    const findings = await detector.run(context);

    expect(findings.length).toBe(1);
    expect(findings[0].file).toBe("risky.ts");
    expect(findings[0].severity).toBe("high");
    expect(findings[0].message).toContain("Alice");
    expect(findings[0].message).toContain("100%");
    expect(findings[0].metadata!.busFactor).toBe(1);
  });

  it("does NOT flag healthy multi-author file", async () => {
    const detector = new BusFactorDetector();
    const context: DetectorContext = {
      projectRoot: repoDir,
      options: { threshold: 80, filePatterns: ["healthy.ts"] },
    };

    const findings = await detector.run(context);

    // No single author should own >80% of healthy.ts
    expect(findings.length).toBe(0);
  });

  it("returns both flagged and unflagged when scanning all files", async () => {
    const detector = new BusFactorDetector();
    const context: DetectorContext = {
      projectRoot: repoDir,
      options: { threshold: 80 },
    };

    const findings = await detector.run(context);

    // risky.ts should be flagged, healthy.ts should not
    const flaggedFiles = findings.map((f) => f.file);
    expect(flaggedFiles).toContain("risky.ts");
    expect(flaggedFiles).not.toContain("healthy.ts");
  });

  it("finding metadata includes author breakdown", async () => {
    const detector = new BusFactorDetector();
    const context: DetectorContext = {
      projectRoot: repoDir,
      options: { threshold: 80 },
    };

    const findings = await detector.run(context);
    const riskyFinding = findings.find((f) => f.file === "risky.ts")!;

    expect(riskyFinding).toBeDefined();
    expect(riskyFinding.detectorName).toBe("bus-factor");
    expect(riskyFinding.metadata!.topAuthorPercentage).toBe(100);
    const authors = riskyFinding.metadata!.authors as Array<{
      author: string;
      lines: number;
      percentage: number;
    }>;
    expect(authors).toHaveLength(1);
    expect(authors[0].author).toBe("Alice");
  });
});
