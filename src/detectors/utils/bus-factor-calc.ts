export interface BusFactorResult {
  busFactor: number;
  flagged: boolean;
  totalLines: number;
  topAuthorPercentage: number;
}

/**
 * Pure function: given a Map<author, lineCount> and a threshold percentage,
 * calculate the bus factor and determine if the file is a risk.
 *
 * Bus factor = minimum number of authors whose combined lines exceed 50% of total.
 * Flagged = top author's percentage exceeds the threshold.
 */
export function calculateBusFactor(
  authorLines: Map<string, number>,
  threshold: number
): BusFactorResult {
  const totalLines = Array.from(authorLines.values()).reduce((sum, n) => sum + n, 0);

  if (totalLines === 0) {
    return { busFactor: 0, flagged: false, totalLines: 0, topAuthorPercentage: 0 };
  }

  const sorted = Array.from(authorLines.entries()).sort((a, b) => b[1] - a[1]);
  const topAuthorPercentage = (sorted[0][1] / totalLines) * 100;

  let accumulated = 0;
  let busFactor = 0;
  for (const [, lines] of sorted) {
    accumulated += lines;
    busFactor++;
    if (accumulated > totalLines * 0.5) break;
  }

  return {
    busFactor,
    flagged: topAuthorPercentage > threshold,
    totalLines,
    topAuthorPercentage,
  };
}
