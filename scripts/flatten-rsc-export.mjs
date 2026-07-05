import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Next's static export writes route prefetch payloads as directories
 * (`__next.<segment>/__PAGE__.txt`), but the client router requests them
 * flattened with dots (`__next.<segment>.__PAGE__.txt`). Vercel rewrites
 * this; plain static hosts like GitHub Pages 404 and fall back to full-page
 * navigations. This post-build step copies each payload to the flattened
 * name so client-side navigation works on any static file server.
 */

const OUT = path.join(process.cwd(), "out");

function flattenDir(nextDir) {
  const parent = path.dirname(nextDir);
  const base = path.basename(nextDir);
  const walk = (dir, rel) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      const relParts = rel ? `${rel}.${entry}` : entry;
      if (statSync(full).isDirectory()) {
        walk(full, relParts);
      } else {
        const target = path.join(parent, `${base}.${relParts}`);
        if (!existsSync(target)) {
          copyFileSync(full, target);
          count++;
        }
      }
    }
  };
  walk(nextDir, "");
}

let count = 0;

function scan(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    if (entry.startsWith("__next.")) flattenDir(full);
    else scan(full);
  }
}

if (existsSync(OUT)) {
  scan(OUT);
  console.log(`flatten-rsc-export: created ${count} flattened payload file(s)`);
} else {
  console.log("flatten-rsc-export: no out/ directory, skipping");
}
