import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { FileRotDetector } from '../../src/detectors/FileRotDetector.js';
import { RiskSeverity } from '../../src/types.js';

describe('FileRotDetector', () => {
  it('detects files untouched for > 1 year', async () => {
    const fixturePath = path.resolve(__dirname, '../fixtures/rotten-project');
    if (!fs.existsSync(fixturePath)) {
      fs.mkdirSync(fixturePath, { recursive: true });
    }

    const ancientFile = path.join(fixturePath, 'ancient.ts');
    fs.writeFileSync(ancientFile, '// old code');
    
    // Set mtime to 2 years ago
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    fs.utimesSync(ancientFile, twoYearsAgo, twoYearsAgo);

    const detector = new FileRotDetector();
    const findings = await detector.analyze(fixturePath);
    
    const ancientFinding = findings.find(f => f.file?.includes('ancient.ts'));
    expect(ancientFinding).toBeDefined();
    expect(ancientFinding?.severity).toBe(RiskSeverity.LOW);
    expect(ancientFinding?.message).toContain('Untouched for over 1 year');
  });
});
