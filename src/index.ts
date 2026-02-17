import { Spectre } from './Spectre.js';

export { Spectre };

// For CLI
if (process.argv[1] === import.meta.url) {
  // Simple runner
  (async () => {
    const target = process.argv[2] || '.';
    const spectre = new Spectre();
    console.log(`Auditing ${target}...`);
    const report = await spectre.audit(target);
    console.log(JSON.stringify(report, null, 2));
  })();
}
