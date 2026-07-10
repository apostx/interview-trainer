// Publish the CURRENT working state (committed or not) to the beta branch,
// which deploys to https://interviewtrainer.sallai.cc/beta/ — without
// creating any commit on your current branch.
//
//   npm run release:beta
//
// How: the working tree is snapshotted into a commit object directly
// (git write-tree + commit-tree) and force-pushed to refs/heads/beta.
// Your branch, history and staging area stay exactly as they were.
import { execSync, spawnSync } from "node:child_process";

const quote = (a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
const run = (cmd, args) => {
  const line = [cmd, ...args.map(quote)].join(" ");
  const r = spawnSync(line, { stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.error(`\n✗ "${line}" failed — nothing was pushed to beta.`);
    execSync("git reset -q"); // unstage; working tree untouched
    process.exit(r.status ?? 1);
  }
};
const out = (cmd) => execSync(cmd).toString().trim();

// Fail fast locally — the workflow gates again on the runner.
run("npm", ["run", "content:check"]);
run("npm", ["test"]);

// Snapshot the working tree (including new files) into a commit object.
run("git", ["add", "-A"]);
const tree = out("git write-tree");
const head = out("git rev-parse HEAD");
const msg = `beta: working state of ${out("git rev-parse --abbrev-ref HEAD")}@${head.slice(0, 7)}`;
const commit = out(`git commit-tree ${tree} -p ${head} -m "${msg}"`);
execSync("git reset -q"); // unstage — your branch is untouched

run("git", ["push", "--force", "origin", `${commit}:refs/heads/beta`]);

console.log(`\n✓ Working state pushed to beta (${commit.slice(0, 7)}).`);
console.log("  Deploy: https://github.com/apostx/interview-trainer/actions");
console.log("  Live in ~2 minutes: https://interviewtrainer.sallai.cc/beta/");
console.log("  Promote to production when happy: npm run release:content");
