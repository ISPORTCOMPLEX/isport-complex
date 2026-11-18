// vypíše zostávajúce neobalené slovenské literály (mimo t()/msg())
const ts = require('/home/claude/.npm-global/lib/node_modules/typescript');
const fs = require('fs');
const { textLike } = require('./codemod.cjs');
for (const f of process.argv.slice(2)) {
  const src = fs.readFileSync(f, 'utf8'); const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out = [];
  (function v(n) {
    if (ts.isImportDeclaration(n)) return;
    if (ts.isCallExpression(n) && /^(t|tr|t\.n|tr\.n|msg|console\.\w+)$/.test(n.expression.getText(sf))) return;
    if (ts.isJsxText(n) && /\p{L}/u.test(n.text.trim())) out.push(n.text.trim().replace(/\s+/g, ' '));
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && /[áäčďéíĺľňóôŕšťúýžÁČĎĽŇŠŤŽ]/.test(n.text)) out.push(n.text);
    if (ts.isTemplateExpression(n) && /[áäčďéíĺľňóôŕšťúýžÁČĎĽŇŠŤŽ]/.test(n.getText(sf))) { out.push('`' + n.getText(sf).slice(1, 80)); return; }
    ts.forEachChild(n, v);
  })(sf);
  if (out.length) console.log(`== ${f} (${out.length})\n  ` + out.map((s) => s.slice(0, 90)).join('\n  '));
}
