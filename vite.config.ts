import { defineConfig } from 'vite';

/**
 * Local / Vercel: default `/`.
 * GitHub Pages: set VITE_BASE to `/<repository-name>/` in CI (see workflows).
 */
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
});
