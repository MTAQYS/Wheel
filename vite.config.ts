import { defineConfig, type Plugin } from 'vitest/config';

const STRICT_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; media-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-src 'none'; worker-src 'none'";

/**
 * Vite's dev server needs eval and a websocket. The published page keeps the
 * strict policy from index.html; this plugin only relaxes it while serving.
 */
function relaxCspInDev(): Plugin {
  return {
    name: 'relax-csp-in-dev',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace(STRICT_CSP, [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self' ws:",
        "worker-src 'self' blob:",
      ].join('; '));
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE || '/Wheel/',
  plugins: [relaxCspInDev()],
  build: {
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
