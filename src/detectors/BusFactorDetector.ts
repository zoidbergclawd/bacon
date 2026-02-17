import { execFileSync } from "child_process";
import * as path from "path";

export interface AuthorLineCount {
  author: string;
  lines: number;
  percentage: number;
}

export interface FileReport {
  filePath: string;
  totalLines: number;
  authors: AuthorLineCount[];
  busFactorScore: number;
  flagged: boolean;
}

export interface BusFactorReport {
  repoPath: string;
  analyzedAt: string;
  threshold: number;
  files: FileReport[];
  summary: {
    totalFiles: number;
    flaggedFiles: number;
    overallBusFactor: number;
  };
}

export interface BusFactorOptions {
  repoPath?: string;
  threshold?: number;
  filePatterns?: string[];
}

/**
 * Parse git blame porcelain output into author -> line count map.
 */
export function parseBlameOutput(output: string): Map<string, number> {
  const authorCounts = new Map<string, number>();
  const lines = output.split("\n");

  for (const line of lines) {
    if (line.startsWith("author ")) {
      const author = line.slice("author ".length).trim();
      if (author && author !== "Not Committed Yet") {
        authorCounts.set(author, (authorCounts.get(author) ?? 0) + 1);
      }
    }
  }

  return authorCounts;
}

/**
 * Calculate bus factor score from author line counts.
 * Bus factor = minimum number of authors whose combined ownership
 * covers > 50% of lines.
 */
export function calculateBusFactor(authors: AuthorLineCount[]): number {
  if (authors.length === 0) return 0;

  const sorted = [...authors].sort((a, b) => b.lines - a.lines);
  const totalLines = sorted.reduce((sum, a) => sum + a.lines, 0);
  if (totalLines === 0) return 0;

  let accumulated = 0;
  let count = 0;
  for (const author of sorted) {
    accumulated += author.lines;
    count++;
    if (accumulated > totalLines * 0.5) {
      return count;
    }
  }

  return count;
}

/**
 * Analyze a single file's git blame to produce author counts.
 */
export function analyzeFile(
  filePath: string,
  repoPath: string,
  threshold: number
): FileReport | null {
  try {
    const output = execFileSync(
      "git",
      ["blame", "--porcelain", "--", filePath],
      {
        cwd: repoPath,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      }
    );

    const authorCounts = parseBlameOutput(output);
    const totalLines = Array.from(authorCounts.values()).reduce(
      (sum, n) => sum + n,
      0
    );

    if (totalLines === 0) return null;

    const authors: AuthorLineCount[] = Array.from(authorCounts.entries())
      .map(([author, lines]) => ({
        author,
        lines,
        percentage: Math.round((lines / totalLines) * 10000) / 100,
      }))
      .sort((a, b) => b.lines - a.lines);

    const busFactorScore = calculateBusFactor(authors);
    const flagged = authors.some((a) => a.percentage > threshold);

    return {
      filePath,
      totalLines,
      authors,
      busFactorScore,
      flagged,
    };
  } catch {
    // File may be binary, untracked, or git blame fails — skip it
    return null;
  }
}

/**
 * Get tracked files in the repo, optionally filtered by patterns.
 */
export function getTrackedFiles(
  repoPath: string,
  patterns?: string[]
): string[] {
  const args = ["ls-files"];
  if (patterns && patterns.length > 0) {
    args.push("--");
    args.push(...patterns);
  }

  const output = execFileSync("git", args, {
    cwd: repoPath,
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });

  return output
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
}

/**
 * Run bus factor analysis on a git repository.
 */
export function detect(options: BusFactorOptions = {}): BusFactorReport {
  const repoPath = path.resolve(options.repoPath ?? ".");
  const threshold = options.threshold ?? 80;
  const files = getTrackedFiles(repoPath, options.filePatterns);

  const fileReports: FileReport[] = [];

  for (const file of files) {
    const report = analyzeFile(file, repoPath, threshold);
    if (report) {
      fileReports.push(report);
    }
  }

  const flaggedFiles = fileReports.filter((f) => f.flagged).length;

  // Overall bus factor: across the whole repo, count unique authors
  // and find minimum set covering >50% of total lines
  const globalAuthorCounts = new Map<string, number>();
  for (const report of fileReports) {
    for (const author of report.authors) {
      globalAuthorCounts.set(
        author.author,
        (globalAuthorCounts.get(author.author) ?? 0) + author.lines
      );
    }
  }

  const globalTotalLines = Array.from(globalAuthorCounts.values()).reduce(
    (sum, n) => sum + n,
    0
  );

  const globalAuthors: AuthorLineCount[] = Array.from(
    globalAuthorCounts.entries()
  )
    .map(([author, lines]) => ({
      author,
      lines,
      percentage:
        globalTotalLines > 0
          ? Math.round((lines / globalTotalLines) * 10000) / 100
          : 0,
    }))
    .sort((a, b) => b.lines - a.lines);

  const overallBusFactor = calculateBusFactor(globalAuthors);

  return {
    repoPath,
    analyzedAt: new Date().toISOString(),
    threshold,
    files: fileReports,
    summary: {
      totalFiles: fileReports.length,
      flaggedFiles,
      overallBusFactor,
    },
  };
}
