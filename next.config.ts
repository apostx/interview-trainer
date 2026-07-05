import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
