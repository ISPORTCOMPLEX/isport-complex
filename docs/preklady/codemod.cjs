// Codemod: obalí slovenské texty v JSX/TS do t() a doplní const t = useT() / await getT().
// Použitie: node codemod.cjs <súbory...>   (prepíše súbory na mieste, vypíše report)
const ts = require('/home/claude/.npm-global/lib/node_modules/typescript');
const fs = require('fs');

const DIA = /[áäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/;
const SKIP_ATTRS = new Set(['className', 'href', 'key', 'id', 'src', 'type', 'name', 'rel', 'target', 'method', 'role', 'htmlFor', 'sizes', 'ratio', 'viewBox', 'd', 'fill', 'stroke', 'autoComplete', 'inputMode', 'pattern', 'dateTime', 'lang', 'hrefLang', 'as', 'slot', 'variant', 'tone', 'icon', 'action', 'encType', 'accept', 'kind', 'size', 'align', 'mode', 'value', 'defaultValue', 'form', 'formAction', 'transform', 'points', 'x', 'y', 'cx', 'cy', 'r', 'width', 'height', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin', 'fontFamily', 'textAnchor', 'dominantBaseline', 'preserveAspectRatio', 'gradientUnits', 'offset', 'stopColor', 'clipPath', 'mask', 'filter', 'style', 'css', 'loading', 'decoding', 'fetchPriority', 'crossOrigin', 'referrerPolicy', 'sandbox', 'allow', 'nonce', 'integrity', 'media', 'scope', 'dir', 'zone', 'area', 'slug', 'category', 'step', 'min', 'max', 'list', 'aria-hidden', 'aria-current', 'aria-expanded', 'aria-controls', 'aria-labelledby', 'aria-describedby', 'aria-live', 'aria-haspopup', 'aria-pressed', 'aria-selected', 'aria-invalid', 'aria-required', 'aria-busy', 'aria-modal', 'aria-orientation', 'aria-sort', 'aria-autocomplete', 'tabIndex', 'spellCheck', 'enterKeyHint', 'autoCapitalize', 'capture', 'mime', 'format', 'cloud', 'publicId', 'path', 'query', 'param', 'field', 'col', 'colSpan', 'rowSpan', 'headers', 'data-magnet', 'data-rv']);
const TEXT_ATTRS = new Set(['aria-label', 'aria-description', 'aria-roledescription', 'aria-valuetext', 'title', 'placeholder', 'alt', 'label', 'sub', 'hint', 'text', 'heading', 'eyebrow', 'description', 'caption', 'empty', 'legend', 'cta', 'more', 'note', 'lead', 'confirm', 'pending', 'pendingLabel', 'emptyText', 'help', 'subtitle', 'kicker', 'tag', 'badge', 'button', 'buttonLabel', 'submitLabel', 'okLabel', 'cancelLabel', 'question', 'message', 'info', 'error', 'success', 'warning', 'unit', 'suffix', 'prefix', 'tooltip', 'summary', 'intro', 'body', 'chip', 'line', 'linkLabel', 'moreLabel', 'meta', 'status', 'state', 'what', 'who', 'when', 'where', 'why']);
const TEXT_PROPS = new Set(['label', 'title', 'sub', 'text', 'hint', 'description', 'desc', 'heading', 'eyebrow', 'caption', 'empty', 'cta', 'note', 'lead', 'short', 'long', 'tag', 'badge', 'name', 'alt', 'placeholder', 'help', 'message', 'msg', 'error', 'info', 'q', 'a', 'question', 'answer', 'body', 'intro', 'summary', 'subtitle', 'kicker', 'unit', 'tooltip', 'chip', 'what', 'meta', 'line', 'p', 'h', 'title2', 'more', 'button', 'warn', 'ok', 'detail', 'details', 'why', 'blurb', 'quote', 'k', 'v']);
const SKIP_PROPS = new Set(['className', 'href', 'key', 'id', 'src', 'slug', 'icon', 'slot', 'type', 'kind', 'tone', 'variant', 'path', 'match', 'also', 'value', 'cat', 'category', 'zone', 'area', 'color', 'fill', 'stroke', 'css', 'role', 'method', 'url', 'mode', 'status', 'code', 'unitCode', 'timeZone', 'locale', 'currency', 'format', 'pattern', 'mime', 'ratio', 'sizes', 'weekday', 'month', 'day', 'year', 'hour', 'minute', 'era', 'style', 'display']);
const CODE_CALL = /^(console\.|new Error|Error|redirect|permanentRedirect|notFound|revalidatePath|revalidateTag|fetch|JSON\.|RegExp|new RegExp|require|import|prisma\.|.*\.(includes|startsWith|endsWith|replace|replaceAll|split|join|indexOf|lastIndexOf|match|matchAll|test|get|set|has|delete|append|getAll|setAttribute|getAttribute|removeAttribute|addEventListener|removeEventListener|querySelector|querySelectorAll|closest|matches|toLocaleString|toLocaleDateString|toLocaleTimeString|padStart|padEnd|localeCompare|createElement|dispatchEvent|postMessage|log|warn|error|info|debug|find|filter|some|every)$|Intl\.|new Intl\.|logSecurity|securityLog|audit|logAudit|track|cookies|headers|encodeURIComponent|decodeURIComponent|String|Number|Boolean|Date|new Date|URL|new URL|new URLSearchParams|URLSearchParams|setHeader|header|Response|new Response|NextResponse|NextResponse\.\w+|t|msg|t\.n|useT|getT|tFor|cn|clsx|hash|hmac|sign|verify|createHash|randomBytes|Buffer\.\w+|crypto\.\w+|assert\.\w+|describe|it|test)$/;

const report = [];

function isPathLike(s) {
  return /^[\/#.?@]/.test(s) || /^(data|mailto|tel|blob):/.test(s) || /^https?:/.test(s) || /^[a-z0-9_.-]+(\/[a-z0-9_.\-[\]]*)+$/i.test(s) || /^[a-z0-9]+([-_][a-z0-9]+)+$/.test(s) || /^[a-z][a-zA-Z0-9]*$/.test(s) && !DIA.test(s) && s.length < 3;
}
function hasLetters(s) {
  return /\p{L}/u.test(s);
}
function textLike(s) {
  if (!hasLetters(s) || isPathLike(s)) return false;
  if (DIA.test(s)) return true;
  if (/\s/.test(s) && /\p{L}{2}/u.test(s) && !/^[a-z0-9_-]+(\s+[a-z0-9_:-]+)+$/.test(s)) return true; // vety, nie zoznamy tried
  return false;
}
function textLikeLoose(s) {
  // pre pozície, kde ide určite o text (JSX deti, textové atribúty a vlastnosti)
  if (!hasLetters(s)) return false;
  if (/^[a-z0-9]+([-_][a-z0-9]+)+$/.test(s) && !DIA.test(s)) return false;
  if (/^[\/#]/.test(s) || /^https?:/.test(s)) return false;
  if (!/\p{Ll}/u.test(s) && !/\s\p{Lu}\p{Ll}/u.test(s)) return false; // kódy, značky a premenné (SK, I-SPORT, CLOUDINARY_API_KEY)
  return true;
}

function jsxTextValue(raw) {
  // pravidlá JSX pre medzery
  const lines = raw.split(/\r?\n/);
  let out = [];
  lines.forEach((line, i) => {
    let l = line.replace(/\t/g, ' ');
    if (i !== 0) l = l.replace(/^\s+/, '');
    if (i !== lines.length - 1) l = l.replace(/\s+$/, '');
    if (l) out.push(l);
  });
  return out.join(' ');
}

const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

function processFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const isClient = /^\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/.test(src);
  const isServerActions = /^\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*['"]use server['"]/.test(src);
  const repl = new Map(); // node -> function(emit) => string
  let T = 't';
  (function findT(n) {
    if ((ts.isVariableDeclaration(n) || ts.isParameter(n) || ts.isBindingElement(n) || ts.isFunctionDeclaration(n)) && n.name && ts.isIdentifier(n.name) && n.name.text === 't' && !/use(T|Translations)\(|getT\(/.test(n.getText(sf))) T = 'tr';
    ts.forEachChild(n, findT);
  })(sf);
  const hasClientImport = src.includes("from '@/lib/i18n/client'");
  const hasServerImport = src.includes("from '@/lib/i18n/server'");
  const hosts = new Set();
  const msgUsed = { v: false };
  let tUsed = false;

  const isComponentName = (n) => !!n && /^[A-Z]/.test(n);
  function fnName(fn) {
    if (fn.name && ts.isIdentifier(fn.name)) return fn.name.text;
    const p = fn.parent;
    if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
    return null;
  }
  function isDefaultExport(fn) {
    return ts.isFunctionDeclaration(fn) && fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
  }
  function isExported(fn) {
    if (fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return true;
    const vs = fn.parent?.parent?.parent;
    return vs && ts.isVariableStatement(vs) && vs.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  }
  function isFn(n) {
    return ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isMethodDeclaration(n);
  }
  function hostOf(node) {
    let host = null;
    for (let p = node.parent; p; p = p.parent) {
      if (isFn(p)) {
        const name = fnName(p);
        const topLevel = p.parent === sf || (p.parent && ts.isVariableDeclaration(p.parent) && p.parent.parent?.parent?.parent === sf);
        if (isComponentName(name) || isDefaultExport(p) || name === 'generateMetadata') host = p;
        else if (isServerActions && topLevel && isExported(p)) host = p;
      }
      if (ts.isVariableStatement(p) && p.parent === sf && metadataStmt(p)) return { meta: p };
    }
    return host;
  }
  function metadataStmt(vs) {
    const d = vs.declarationList.declarations[0];
    return d && ts.isIdentifier(d.name) && d.name.text === 'metadata' && vs.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ? d : null;
  }

  function insideT(node) {
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isCallExpression(p)) {
        const c = p.expression.getText();
        if (c === 't' || c === 'tr' || c === 't.n' || c === 'msg') return true;
      }
      if (isFn(p)) return false;
    }
    return false;
  }

  // Kontext, v ktorom je literál určite viditeľný text (JSX dieťa cez podmienky / ||).
  function inJsxChildContext(node) {
    let p = node.parent;
    while (p && (ts.isConditionalExpression(p) || ts.isParenthesizedExpression(p) || (ts.isBinaryExpression(p) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(p.operatorToken.kind)))) {
      if (ts.isConditionalExpression(p) && p.condition === node) return false;
      node = p;
      p = p.parent;
    }
    if (p && ts.isJsxExpression(p) && p.parent && (ts.isJsxElement(p.parent) || ts.isJsxFragment(p.parent))) return 'child';
    if (p && ts.isJsxExpression(p) && p.parent && ts.isJsxAttribute(p.parent)) return 'attr:' + p.parent.name.getText();
    if (p && ts.isPropertyAssignment(p) && p.initializer === node) return 'prop:' + p.name.getText().replace(/['"]/g, '');
    if (p && ts.isReturnStatement(p)) return 'return';
    if (p && ts.isArrowFunction(p) && p.body === node) return 'return';
    if (p && ts.isVariableDeclaration(p)) return 'var:' + p.name.getText();
    if (p && ts.isCallExpression(p)) return 'call:' + p.expression.getText();
    if (p && ts.isNewExpression(p)) return 'call:new ' + p.expression.getText();
    if (p && ts.isArrayLiteralExpression(p)) return 'array';
    if (p && ts.isTemplateSpan(p)) return 'tpl';
    if (p && ts.isBinaryExpression(p)) return 'bin:' + ts.tokenToString(p.operatorToken.kind);
    if (p && ts.isJsxAttribute(p)) return 'attr:' + p.name.getText();
    return 'other:' + (p ? ts.SyntaxKind[p.kind] : '');
  }

  function shouldWrapLiteral(node, text) {
    const pp = node.parent;
    if (!pp) return false;
    if (ts.isImportDeclaration(pp) || ts.isExportDeclaration(pp) || ts.isExternalModuleReference(pp) || ts.isLiteralTypeNode(pp) || ts.isImportTypeNode?.(pp)) return false;
    if (ts.isExpressionStatement(pp)) return false; // 'use client'
    if (ts.isElementAccessExpression(pp) && pp.argumentExpression === node) return false;
    if (ts.isPropertyAssignment(pp) && pp.name === node) return false;
    if (ts.isCaseClause(pp)) return false;
    if (ts.isBinaryExpression(pp) && /^(===|!==|==|!=|in|instanceof|<|>|<=|>=)$/.test(ts.tokenToString(pp.operatorToken.kind))) return false;
    if (ts.isJsxAttribute(pp)) {
      const n = pp.name.getText();
      if (SKIP_ATTRS.has(n) || n.startsWith('data-') || n.startsWith('on')) return false;
      return TEXT_ATTRS.has(n) ? textLikeLoose(text) : textLike(text);
    }
    if (insideT(node)) return false;
    for (let a = node.parent; a && !isFn(a); a = a.parent) {
      if (ts.isJsxAttribute(a)) {
        const n = a.name.getText();
        if (SKIP_ATTRS.has(n) || n.startsWith('data-') || n.startsWith('on')) return false;
        break;
      }
      if (ts.isPropertyAssignment(a) && SKIP_PROPS.has(a.name.getText().replace(/['"]/g, ''))) return false;
    }
    const ctx = inJsxChildContext(node);
    if (ctx === 'child') return textLikeLoose(text);
    if (ctx.startsWith('attr:')) {
      const n = ctx.slice(5);
      if (SKIP_ATTRS.has(n) || n.startsWith('data-') || n.startsWith('on')) return false;
      return TEXT_ATTRS.has(n) ? textLikeLoose(text) : textLike(text);
    }
    if (ctx.startsWith('prop:')) {
      const n = ctx.slice(5);
      if (SKIP_PROPS.has(n)) return false;
      return TEXT_PROPS.has(n) ? textLikeLoose(text) && !/^[a-z]+$/.test(text) || textLike(text) : textLike(text);
    }
    if (ctx.startsWith('call:')) {
      const c = ctx.slice(5);
      if (CODE_CALL.test(c)) return false;
      return textLike(text);
    }
    if (ctx === 'bin:=' || ctx === 'bin:+=') return textLike(text);
    if (ctx.startsWith('bin:')) return false;
    return textLike(text);
  }

  // názvy premenných pre {x} v preklade
  function varName(expr, used) {
    let base;
    if (ts.isIdentifier(expr)) base = expr.text;
    else if (ts.isPropertyAccessExpression(expr)) base = expr.name.text;
    else if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) base = expr.expression.text;
    else if (ts.isCallExpression(expr) && ts.isPropertyAccessExpression(expr.expression)) base = expr.expression.name.text;
    else if (ts.isNonNullExpression(expr)) return varName(expr.expression, used);
    else if (ts.isParenthesizedExpression(expr)) return varName(expr.expression, used);
    else base = 'v';
    base = base.replace(/[^A-Za-z0-9_]/g, '') || 'v';
    let n = base, i = 2;
    while (used.has(n)) n = base + i++;
    used.add(n);
    return n;
  }
  function varsObj(pairs, emit) {
    return '{ ' + pairs.map(([n, e]) => (ts.isIdentifier(e) && e.text === n ? n : `${n}: ${emit(e)}`)).join(', ') + ' }';
  }

  function inParams(node) {
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isParameter(p)) return true;
      if (ts.isBlock(p)) return false;
    }
    return false;
  }
  function markHost(node) {
    if (inParams(node)) return false;
    const h = hostOf(node);
    if (!h) return false;
    if (h.meta) hosts.add(h.meta);
    else hosts.add(h);
    tUsed = true;
    return true;
  }
  function inAnyFn(node) {
    for (let p = node.parent; p; p = p.parent) if (isFn(p)) return true;
    return false;
  }
  function wrapCall(node, key, varsStr) {
    if (markHost(node)) return `${T}(${q(key)}${varsStr ? ', ' + varsStr : ''})`;
    if (inAnyFn(node)) {
      report.push(`${file}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}: HELPER ${q(key)}`);
      return null;
    }
    msgUsed.v = true;
    report.push(`${file}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}: msg(${q(key)})${varsStr ? ' [VARS ' + varsStr + ']' : ''}`);
    return varsStr ? null : `msg(${q(key)})`;
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isCallExpression(node) && ['t', 't.n', 'msg'].includes(node.expression.getText())) return;
    // JSX deti: zlúčime behy textu a jednoduchých výrazov do jednej vety
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      const kids = node.children;
      let run = [];
      const flush = () => {
        const items = run;
        const hasText = items.some((k) => ts.isJsxText(k) && textLikeLoose(jsxTextValue(k.text)));
        if (hasText) {
          const first = items[0], last = items[items.length - 1];
          repl.set(first, (emit) => {
            const used = new Set();
            const pairs = [];
            let key = '';
            for (const k of items) {
              if (ts.isJsxText(k)) key += k.text.replace(/^[ \t]*\r?\n\s*/, '').replace(/\s*\r?\n[ \t]*$/, '').replace(/\s*\r?\n\s*/g, ' ');
              else if (k.expression && ts.isStringLiteral(k.expression)) key += k.expression.text;
              else if (k.expression) {
                const n = varName(k.expression, used);
                pairs.push([n, k.expression]);
                key += `{${n}}`;
              }
            }
            const wsLead = ts.isJsxText(first) ? (first.text.match(/^[ \t]*\r?\n\s*/) || [''])[0] : '';
            const wsTrail = ts.isJsxText(last) ? (last.text.match(/\s*\r?\n[ \t]*$/) || [''])[0] : '';
            const lead = /^\s/.test(key) ? "{' '}" : '';
            const trail = /\s$/.test(key) ? "{' '}" : '';
            const core = key.trim().replace(/\s+/g, ' ');
            const call = wrapCall(first, core, pairs.length ? varsObj(pairs, emit) : '');
            if (call === null) return null;
            return lead + '{' + call + '}' + trail + (items.length === 1 ? wsTrail : '');
          });
          const wsT = ts.isJsxText(last) ? (last.text.match(/\s*\r?\n[ \t]*$/) || [''])[0] : '';
          for (const k of items.slice(1)) repl.set(k, () => (k === last ? wsT : ''));
        }
        run = [];
      };
      for (const k of kids) {
        const simple = ts.isJsxText(k) || (ts.isJsxExpression(k) && k.expression && (ts.isIdentifier(k.expression) || ts.isPropertyAccessExpression(k.expression) || ts.isStringLiteral(k.expression) || (ts.isCallExpression(k.expression) && !k.expression.getText().includes('<') && !/^(t|t\.n|msg)\(/.test(k.expression.getText()) && !/\.map\(/.test(k.expression.getText())) || ts.isNonNullExpression(k.expression)));
        if (simple) run.push(k);
        else {
          flush();
        }
      }
      flush();
    }
    if ((ts.isStringLiteral(node) || (ts.isNoSubstitutionTemplateLiteral(node) && !ts.isTaggedTemplateExpression(node.parent))) && !repl.has(node)) {
      if (node.parent && ts.isJsxExpression(node.parent) && node.parent.parent && (ts.isJsxElement(node.parent.parent) || ts.isJsxFragment(node.parent.parent))) {
        // samostatný {'text'} v JSX – rieši flush; ak nebol v behu s textom:
      }
      const text = node.text;
      if (shouldWrapLiteral(node, text)) {
        const inAttrDirect = node.parent && ts.isJsxAttribute(node.parent);
        repl.set(node, () => {
          const c = wrapCall(node, text, '');
          return inAttrDirect ? `{${c}}` : c;
        });
      }
    }
    if (ts.isTemplateExpression(node) && !repl.has(node) && !(node.parent && ts.isTaggedTemplateExpression(node.parent))) {
      const parts = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join('');
      const staticWords = parts.replace(/[\/?#=&.:,;()\[\]_-]+/g, ' ').trim();
      const urlish = /^[\/?#=&.:a-z0-9_-]*$/i.test(parts.replace(/\s/g, '')) && !DIA.test(parts) && !/\s\p{L}{2,}/u.test(' ' + parts.trim()) || /^[\/?#&=]/.test(parts) || /^(https?|mailto|tel|data):/.test(node.head.text) || /^\/|^\?|=$/.test(node.head.text);
      if (!urlish && hasLetters(staticWords) && shouldWrapLiteral(node, parts.replace(/\s+/g, ' ')) && !isPathLike(node.head.text)) {
        repl.set(node, (emit) => {
          const used = new Set();
          const pairs = [];
          let key = node.head.text;
          for (const s of node.templateSpans) {
            const n = varName(s.expression, used);
            pairs.push([n, s.expression]);
            key += `{${n}}` + s.literal.text;
          }
          const c = wrapCall(node, key, varsObj(pairs, emit));
          if (c === null) return null;
          return node.parent && ts.isJsxAttribute(node.parent) ? `{${c}}` : c;
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  // emit s náhradami (2 prechody: najprv zistíme hostiteľov, potom vložíme t)
  function emit(node) {
    const r = repl.get(node);
    if (r) {
      const out = r(emit);
      if (out !== null && out !== undefined) return out;
    }
    const kids = node.getChildren(sf);
    if (!kids.length) return src.slice(node.getStart(sf), node.getEnd());
    let out = '';
    let pos = node.getStart(sf);
    for (const k of kids) {
      out += src.slice(pos, k.getStart(sf));
      out += emit(k);
      pos = k.getEnd();
    }
    out += src.slice(pos, node.getEnd());
    const stmt = isClient ? `const ${T} = useT();` : `const ${T} = await getT();`;
    const par = node.parent;
    if (par && hosts.has(par) && par.body === node && !/const (t|tr) = (useT\(\)|await getT\(\))/.test(src.slice(node.getStart(sf), node.getEnd()))) {
      if (ts.isBlock(node)) {
        const col = sf.getLineAndCharacterOfPosition(par.getStart(sf)).character;
        const ind = ' '.repeat(col + 2);
        out = out.replace(/^\{/, '{\n' + ind + stmt);
      } else {
        out = `{\n  ${stmt}\n  return ${out};\n}`;
      }
    }
    if (hosts.has(node)) {
      if (ts.isVariableStatement(node)) {
        const typed = /:\s*Metadata\s*=/.test(out);
        const init = out.slice(out.indexOf('=') + 1).trim().replace(/;$/, '');
        out = `export async function generateMetadata()${typed ? ': Promise<Metadata>' : ''} {\n  const ${T} = await getT();\n  return ${init};\n}`;
      } else if (!isClient && !node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) {
        if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) out = 'async ' + out;
        else out = out.replace(/^((?:export\s+)?(?:default\s+)?)function/, '$1async function');
      }
    }
    return out;
  }
  function render() {
    // prvý prechod naplní hosts
    const savedReport = report.length;
    emit(sf);
    report.length = savedReport;
    let out = src.slice(0, sf.getStart(sf)) + emit(sf);
    if (!tUsed && !msgUsed.v) return null;
    // importy
    const imps = [];
    const has = (name, mod) => new RegExp(`import[^;]*\\b${name}\\b[^;]*from '${mod}'`).test(src);
    if (tUsed && isClient && !has('useT', '@/lib/i18n/client')) imps.push("import { useT } from '@/lib/i18n/client';");
    if (tUsed && !isClient && !has('getT', '@/lib/i18n/server')) imps.push("import { getT } from '@/lib/i18n/server';");
    if (msgUsed.v && !has('msg', '@/lib/i18n/translate')) imps.push("import { msg } from '@/lib/i18n/translate';");
    if (!imps.length) return out;
    const lastImp = [...sf.statements].filter((s) => ts.isImportDeclaration(s)).pop();
    if (lastImp) {
      const impText = src.slice(lastImp.getStart(sf), lastImp.getEnd());
      const endLine = out.indexOf('\n', out.indexOf(impText) + impText.length - 1);
      out = out.slice(0, endLine + 1) + imps.join('\n') + '\n' + out.slice(endLine + 1);
    } else {
      const m = out.match(/^(\s*(?:\/\/[^\n]*\n)*\s*(['"]use (client|server)['"];?\n)?)/);
      const at = m ? m[0].length : 0;
      out = out.slice(0, at) + imps.join('\n') + '\n' + out.slice(at);
    }
    return out;
  }

  return { render, isClient, hosts };
}

module.exports = { processFile, report, textLike, textLikeLoose, jsxTextValue };
