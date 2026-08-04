import { spawnSync } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const workspaces = [
  { label: "root", args: ["audit", "--audit-level=high"] },
  {
    label: "dashboard",
    args: ["audit", "--prefix", "dashboard", "--audit-level=high"],
  },
  {
    label: "worker",
    args: ["audit", "--prefix", "worker", "--audit-level=high"],
  },
];

let failed = false;
for (const workspace of workspaces) {
  console.log(`\nL2 dependency audit: ${workspace.label}`);
  const result = spawnSync(npm, workspace.args, { stdio: "inherit" });
  if (result.error) {
    console.error(result.error.message);
    failed = true;
  } else if (result.status !== 0) {
    failed = true;
  }
}

process.exitCode = failed ? 1 : 0;
