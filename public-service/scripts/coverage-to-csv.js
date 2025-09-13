/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function main() {
  const summaryPath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
  if (!fs.existsSync(summaryPath)) {
    console.error('coverage-summary.json not found. Run "npm run test:coverage" first.');
    process.exit(1);
  }
  const outCsv = path.join(__dirname, '..', 'coverage', 'coverage-summary.csv');

  const data = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const projectRoot = path.join(__dirname, '..');

  const header = [
    'file',
    'statements_pct','statements_covered','statements_total',
    'branches_pct','branches_covered','branches_total',
    'functions_pct','functions_covered','functions_total',
    'lines_pct','lines_covered','lines_total'
  ];
  const rows = [header.join(',')];

  for (const [file, metrics] of Object.entries(data)) {
    const s = metrics.statements || {}; 
    const b = metrics.branches || {};
    const f = metrics.functions || {};
    const l = metrics.lines || {};
    const fileLabel = file === 'total' ? 'total' : path.relative(projectRoot, file).replace(/\\/g, '/');
    const row = [
      fileLabel,
      s.pct ?? '', s.covered ?? '', s.total ?? '',
      b.pct ?? '', b.covered ?? '', b.total ?? '',
      f.pct ?? '', f.covered ?? '', f.total ?? '',
      l.pct ?? '', l.covered ?? '', l.total ?? ''
    ].join(',');
    rows.push(row);
  }

  fs.writeFileSync(outCsv, rows.join('\n'), 'utf8');
  console.log(`CSV written to ${outCsv}`);
}

main();






