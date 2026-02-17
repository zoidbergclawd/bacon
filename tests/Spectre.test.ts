import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { Spectre } from '../src/Spectre.js';

describe('Spectre Engine', () => {
  it('runs all configured detectors', async () => {
    const fixturePath = path.resolve(__dirname, 'fixtures/risky-project');
    const spectre = new Spectre();
    
    const report = await spectre.audit(fixturePath);
    
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.findings.some(f => f.category === 'Dependency Health')).toBe(true);
  });
});
