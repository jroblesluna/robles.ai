import { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";
import { createMetaInjector } from "./seo/metaInjector.js";
import { mountPublicSite } from './publicServing.js';
import type { SlugIndex } from "./seo/slugIndex.js";

const viteLogger = createLogger();

/** Shared slugIndex instance, initialized when the server starts. */
let _slugIndex: SlugIndex | null = null;

/** Returns the shared SlugIndex instance (available after setupVite or serveStatic). */
export function getSlugIndex(): SlugIndex | null {
  return _slugIndex;
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as true,
  };

  const resolvedConfig = await viteConfig({ command: 'serve', mode: 'development', isSsrBuild: false, isPreview: false });
  const vite = await createViteServer({
    ...resolvedConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  // MetaInjector middleware: injects SEO meta tags into HTML responses
  const sourcePath = path.resolve(__dirname, "..", "index.html");
  const distPath = path.resolve(__dirname, "../dist");
  const { handler: metaInjector, slugIndex } = createMetaInjector({
    mode: 'development',
    distPath,
    sourcePath,
    // Link the CSS in <head> so SSR HTML isn't unstyled until main.tsx injects it (dev-only FOUC)
    viteTransform: (url: string, html: string) =>
      vite.transformIndexHtml(url, html.replace('</head>', '<link rel="stylesheet" href="/src/index.css" />\n</head>')),
    renderHome: async (url, translations) => (await vite.ssrLoadModule('/src/entry-server.tsx')).renderHome(url, translations),
  });
  _slugIndex = slugIndex;
  app.use(metaInjector);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "../dist");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  _slugIndex = mountPublicSite(app, distPath);
}
