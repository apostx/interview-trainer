import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  // Baked in at build time; shown in the sidebar so the deployed version
  // is visible at a glance. The beta deploy overrides it with a
  // "<version>-beta.<sha>" label via APP_VERSION_LABEL.
  env: { NEXT_PUBLIC_APP_VERSION: process.env.APP_VERSION_LABEL ?? pkg.version },
  // Fully static export — the app is client-only (IndexedDB + Web Worker),
  // so it can be hosted on GitHub Pages or any static file server.
  output: "export",
  // GitHub Pages serves directories, not extensionless files.
  trailingSlash: true,
  // Set by the deploy workflow to "/<repo-name>" for GitHub Pages project
  // sites; empty for local dev and root-domain hosting.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  images: { unoptimized: true },
};

export default nextConfig;
