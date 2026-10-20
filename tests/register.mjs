import { register } from 'node:module';
register('./hooks.mjs', import.meta.url);
process.env.AUTH_SECRET ??= 'test-secret-test-secret-test-secret-0123456789';
