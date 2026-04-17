import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import type { Plugin as EsbuildPlugin } from 'esbuild';

import { defineConfig, type Plugin } from 'vite';

import { oauthClientMetadataObject } from './src/auth/oauthClientMetadata';
import { resolveBuildGitSha } from './src/build/resolveBuildGitSha';
import { viteAdminIndexRewrite } from './src/build/viteAdminIndexRewrite';
import { syncAcknowledgementsAssets } from './scripts/syncAcknowledgementsAssets';

const timidityFreepatsCfg = readFileSync(
  fileURLToPath(new URL('./node_modules/timidity/freepats.cfg', import.meta.url)),
  'utf8',
);

function tryGitRevShort(): string | undefined {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return undefined;
  }
}

const buildGitSha = resolveBuildGitSha(process.env, tryGitRevShort());

/** Public site origin for OAuth `client_id` JSON (Vercel / Cloudflare Pages / manual). */
function deploymentSiteUrl(): string | undefined {
  // Prefer explicit canonical URL: on Vercel, VERCEL_URL is always *.vercel.app, so builds
  // would otherwise bake the wrong redirect_uris when users sign in on a custom domain.
  const manual = process.env.VITE_PUBLIC_APP_ORIGIN?.trim();
  if (manual) {
    return manual.replace(/\/$/, '');
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel}`;
  }
  const cf = process.env.CF_PAGES_URL?.trim();
  if (cf) {
    return cf.startsWith('http') ? cf.replace(/\/$/, '') : `https://${cf}`;
  }
  return undefined;
}

/**
 * Dev-only: match production `vercel.json` rewrites so `/admin` serves `admin/index.html`.
 * Without this, Vite's SPA fallback serves the root `index.html` (main Phaser app) for `/admin`.
 */
function adminRouteDevPlugin(): Plugin {
  return {
    name: 'atdance-admin-route-dev',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url !== undefined) {
          const nextUrl = viteAdminIndexRewrite(req.url);
          if (nextUrl !== req.url) {
            req.url = nextUrl;
          }
        }
        next();
      });
    },
  };
}

function acknowledgementsAssetsPlugin(): Plugin {
  return {
    name: 'atdance-sync-acknowledgements-assets',
    buildStart() {
      syncAcknowledgementsAssets();
    },
  };
}

function inlineTimidityFreepatsInSource(code: string): string {
  const inlined = `const TIMIDITY_CFG = ${JSON.stringify(timidityFreepatsCfg)}`;
  let next = code.replace("const fs = require('fs')\n", '');
  next = next.replace(
    `// Inlined at build time by 'brfs' browserify transform
const TIMIDITY_CFG = fs.readFileSync(
  __dirname + '/freepats.cfg', // eslint-disable-line node/no-path-concat
  'utf8'
)`,
    inlined,
  );
  if (next.includes('fs.readFileSync')) {
    throw new Error('atdance-timidity-inline-freepats: failed to inline timidity freepats.cfg');
  }
  return next;
}

/** Dev: run while esbuild pre-bundles `timidity` so `require()` is compiled away and cfg is inlined. */
function timidityEsbuildInlineFreepatsPlugin(): EsbuildPlugin {
  return {
    name: 'atdance-timidity-esbuild-inline-freepats',
    setup(build) {
      build.onLoad({ filter: /[\\/]timidity[\\/]index\.js$/ }, (args) => {
        const code = readFileSync(args.path, 'utf8');
        if (!code.includes('TIMIDITY_CFG')) {
          return null;
        }
        return { contents: inlineTimidityFreepatsInSource(code), loader: 'js' };
      });
    },
  };
}

/** Production Rollup: same inlining for `node_modules/timidity/index.js`. */
function timidityInlineFreepatsPlugin(): Plugin {
  return {
    name: 'atdance-timidity-inline-freepats',
    enforce: 'pre',
    transform(code, id) {
      const norm = id.replace(/\\/g, '/');
      if (!norm.includes('/node_modules/timidity/') || !norm.endsWith('/index.js')) {
        return null;
      }
      if (!code.includes('TIMIDITY_CFG')) {
        return null;
      }
      return inlineTimidityFreepatsInSource(code);
    },
  };
}

function oauthClientMetadataPlugin(): Plugin {
  return {
    name: 'atdance-oauth-client-metadata',
    apply: 'build',
    generateBundle() {
      const origin = deploymentSiteUrl();
      if (!origin) {
        return;
      }
      const metadata = oauthClientMetadataObject(origin);
      this.emitFile({
        type: 'asset',
        fileName: 'oauth-client-metadata.json',
        source: JSON.stringify(metadata),
      });
    },
  };
}

/** Browser bundle (avoids Node `events`/`path`/etc. in Vite/Rollup). */
const webtorrentBrowser = fileURLToPath(
  new URL('./node_modules/webtorrent/dist/webtorrent.min.js', import.meta.url),
);

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('index.html', import.meta.url)),
        admin: fileURLToPath(new URL('admin/index.html', import.meta.url)),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      webtorrent: webtorrentBrowser,
      buffer: 'buffer',
    },
  },
  define: {
    global: 'globalThis',
    __APP_GIT_SHA__: JSON.stringify(buildGitSha),
  },
  plugins: [
    acknowledgementsAssetsPlugin(),
    timidityInlineFreepatsPlugin(),
    adminRouteDevPlugin(),
    oauthClientMetadataPlugin(),
    {
      name: 'atdance-index-git-flowerbox',
      transformIndexHtml(html) {
        const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
        const flower = `<!--
  atdance · git ${buildGitSha} · ${mode}
  (same SHA as in-game Build info — I key from title / song select)
-->
`;
        return html.replace('<!doctype html>', `<!doctype html>\n${flower}`);
      },
    },
  ],
  optimizeDeps: {
    // `webtorrent` is aliased to the prebuilt `min.js` — do not list
    // `webtorrent/dist/...` here (Vite 6 + Node 24 can double-resolve to ENOTDIR).
    include: ['buffer', 'hyperswarm-web', 'timidity', 'debug', 'events'],
    exclude: ['webtorrent'],
    esbuildOptions: {
      plugins: [timidityEsbuildInlineFreepatsPlugin()],
    },
  },
  server: {
    /** IPv4 loopback so `curl http://127.0.0.1:<port>` and ATProto OAuth callbacks match `redirect_uri`. */
    host: true,
    port: 5174,
    strictPort: true,
  },
});
