// Testovací loader: doplní príponu .ts, alias @/ a nahradí 'server-only' prázdnym modulom.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

export async function resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
  let spec = specifier;
  if (spec.startsWith('@/')) spec = pathToFileURL(path.join(root, spec.slice(2))).href;
  if ((spec.startsWith('.') || spec.startsWith('file:')) && !/\.[cm]?[jt]sx?$/.test(spec)) {
    const base = spec.startsWith('file:') ? fileURLToPath(spec) : path.resolve(path.dirname(fileURLToPath(context.parentURL)), spec);
    for (const ext of ['.ts', '.tsx', '/index.ts']) if (existsSync(base + ext)) return next(pathToFileURL(base + ext).href, context);
  }
  try {
    return await next(spec, context);
  } catch (err) {
    // bcryptjs nie je nainštalovaný (napr. CI bez závislostí) – testy ho nepotrebujú
    if (spec === 'bcryptjs') return { url: 'data:text/javascript,export default { hash() { throw new Error("bcrypt") }, compare() { throw new Error("bcrypt") }, getRounds() { return 12 } }', shortCircuit: true };
    throw err;
  }
}
