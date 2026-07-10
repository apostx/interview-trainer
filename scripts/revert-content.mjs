// Content rollback: restores content/packs/ to the state of an earlier
// release tag, then ships it FORWARD as a new (patch) version — the app code
// stays current, only the data reverts, and the version keeps increasing.
//
//   npm run release:revert                → back to the previous release's data
//   npm run release:revert -- v0.24.0     → back to a specific tag's data
//   npm run release:revert -- v0.24.0 --dry-run   → show the diff, change nothing
import { execSync, spawnSync } from "node:child_process";

const quote = (a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
const run = (cmd, args) => {
  const line = [cmd, ...args.map(quote)].join(" ");
  const r = spawnSync(line, { stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.error(`\n✗ "${line}" failed.`);
    // The tree was clean when we started, so this only undoes the revert.
    execSync("git reset --hard HEAD", { stdio: "inherit" });
    console.error("Working tree restored — nothing was committed or pushed.");
    process.exit(r.status ?? 1);
  }
};
const out = (cmd) => execSync(cmd).toString().trim();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
let target = args.find((a) => !a.startsWith("--"));

// A dirty tree would get mixed into the revert commit — refuse.
if (out("git status --porcelain")) {
  console.error("Working tree is not clean — commit or stash first.");
  process.exit(1);
}

const tags = out('git tag -l "v*" --sort=-v:refname').split("\n").filter(Boolean);
if (tags.length < 2) {
  console.error("Need at least two release tags to revert between.");
  process.exit(1);
}
if (!target) {
  target = tags[1]; // the release before the current one
} else {
  if (!target.startsWith("v")) target = "v" + target;
  if (!tags.includes(target)) {
    console.error(`Tag "${target}" not found. Releases:\n  ` + tags.slice(0, 15).join("\n  "));
    process.exit(1);
  }
}

console.log(`Reverting content/packs to ${target} (current: ${tags[0]})…\n`);

// Replace the whole directory: files added since <target> must disappear too.
run("git", ["rm", "-r", "-q", "content/packs"]);
run("git", ["checkout", target, "--", "content/packs"]);

const diff = out("git status --porcelain -- content/packs");
if (!diff) {
  console.log("Data is already identical to " + target + " — nothing to revert.");
  execSync("git reset --hard HEAD", { stdio: "inherit" });
  process.exit(0);
}
console.log("Data changes:\n" + diff + "\n");

if (dryRun) {
  execSync("git reset --hard HEAD", { stdio: "inherit" });
  console.log("--dry-run: working tree restored, nothing committed.");
  process.exit(0);
}

// The old data must still pass the CURRENT gates — the app code stays new.
run("npm", ["run", "content:check"]);
run("npm", ["test"]);
run("node", ["scripts/content-ids.mjs", "--write"]);

run("git", ["add", "-A"]);
run("git", ["commit", "-m", `revert: content back to ${target} data`]);
run("npm", ["version", "patch", "-m", "chore(release): %s"]);
run("git", ["push", "--follow-tags"]);

console.log(`\n✓ Content reverted to ${target} data and released as a new version.`);
console.log("  https://github.com/apostx/interview-trainer/actions");
