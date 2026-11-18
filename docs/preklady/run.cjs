const { processFile, report } = require('./codemod.cjs');
const fs = require('fs');
const write = process.argv.includes('--write');
for (const f of process.argv.slice(2).filter((x) => !x.startsWith('--'))) {
  const r = processFile(f); const out = r.render();
  if (out === null) continue;
  if (write) fs.writeFileSync(f, out); else fs.writeFileSync('/tmp/claude-0/-home-claude/fe8e5ff7-3b76-51fb-b6ee-f60670967014/scratchpad/i18n/preview.tsx', out);
  console.log('OK', f, r.isClient ? 'client' : 'server', 'hosts', r.hosts.size);
}
fs.writeFileSync('/tmp/claude-0/-home-claude/fe8e5ff7-3b76-51fb-b6ee-f60670967014/scratchpad/i18n/report.txt', report.join('\n'));
console.log('report', report.length);
