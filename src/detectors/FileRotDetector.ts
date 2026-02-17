import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { RiskDetector, RiskFinding, RiskSeverity } from '../types.js';

export class FileRotDetector implements RiskDetector {
  async analyze(projectPath: string): Promise<RiskFinding[]> {
    const findings: RiskFinding[] = [];
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    // Scan for all files except node_modules and .git
    const entries = await fg(['**/*'], {
      cwd: projectPath,
      ignore: ['**/node_modules/**', '**/.git/**'],
      stats: true,
      absolute: true
    });

    for (const entry of entries) {
      if (!entry.stats) continue;

      if (entry.stats.mtime < oneYearAgo) {
        findings.push({
          category: 'Rot',
          severity: RiskSeverity.LOW,
          message: `Code rot: File Untouched for over 1 year (${entry.stats.mtime.toISOString().split('T')[0]})`,
          file: path.relative(projectPath, entry.path),
          recommendation: 'Review for relevance or archive.'
        });
      }
    }

    return findings;
  }
}
