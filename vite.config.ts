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
    },
  },
  optimizeDeps: {
    include: ['webtorrent/dist/webtorrent.min.js'],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
