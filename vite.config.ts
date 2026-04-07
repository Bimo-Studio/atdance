import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';

/** Browser bundle (avoids Node `events`/`path`/etc. in Vite/Rollup). */
const webtorrentBrowser = fileURLToPath(
  new URL('./node_modules/webtorrent/dist/webtorrent.min.js', import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      webtorrent: webtorrentBrowser,
      buffer: 'buffer',
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    // `webtorrent` is aliased to the prebuilt `min.js` — do not list
    // `webtorrent/dist/...` here (Vite 6 + Node 24 can double-resolve to ENOTDIR).
    include: ['buffer', 'hyperswarm-web'],
    exclude: ['webtorrent'],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
