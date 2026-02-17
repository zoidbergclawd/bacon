/**
 * Parse `git blame --line-porcelain` output into a Map of author → line count.
 *
 * Ignores uncommitted lines (author = "Not Committed Yet").
 */
export function parseBlameOutput(raw: string): Map<string, number> {
  const counts = new Map<string, number>();

  for (const line of raw.split("\n")) {
    if (line.startsWith("author ")) {
      const author = line.slice(7).trim();
      if (author && author !== "Not Committed Yet") {
        counts.set(author, (counts.get(author) ?? 0) + 1);
      }
    }
  }

  return counts;
}
