import * as esbuild from "esbuild";
import { cpSync, mkdirSync } from "fs";

const isWatch = process.argv.includes("--watch");

const commonOptions = {
  bundle: true,
  platform: "node",
  target: "es2022",
  external: ["electron"],
  sourcemap: true,
  logLevel: "info",
};

async function build() {
  mkdirSync("dist", { recursive: true });

  // Copy HTML files
  cpSync("src/toolbar.html", "dist/toolbar.html");
  cpSync("src/sidebar.html", "dist/sidebar.html");
  cpSync("src/new-tab-overlay.html", "dist/new-tab-overlay.html");

  // Build main process
  const mainCtx = await esbuild.context({
    ...commonOptions,
    entryPoints: ["src/main.ts"],
    outfile: "dist/main.js",
  });

  // Build preload script
  const preloadCtx = await esbuild.context({
    ...commonOptions,
    entryPoints: ["src/preload.ts"],
    outfile: "dist/preload.js",
  });

  // Build sidebar preload
  const sidebarPreloadCtx = await esbuild.context({
    ...commonOptions,
    entryPoints: ["src/sidebar-preload.ts"],
    outfile: "dist/sidebar-preload.js",
  });

  // Build new-tab overlay preload
  const newTabPreloadCtx = await esbuild.context({
    ...commonOptions,
    entryPoints: ["src/new-tab-preload.ts"],
    outfile: "dist/new-tab-preload.js",
  });

  if (isWatch) {
    await mainCtx.watch();
    await preloadCtx.watch();
    await sidebarPreloadCtx.watch();
    await newTabPreloadCtx.watch();
    console.log("Watching for changes...");
  } else {
    await mainCtx.rebuild();
    await preloadCtx.rebuild();
    await sidebarPreloadCtx.rebuild();
    await newTabPreloadCtx.rebuild();
    await mainCtx.dispose();
    await preloadCtx.dispose();
    await sidebarPreloadCtx.dispose();
    await newTabPreloadCtx.dispose();
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
