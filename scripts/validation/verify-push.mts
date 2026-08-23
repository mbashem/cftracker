#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { runGit, splitNullDelimited } from "./git.mts";

const zeroObjectPattern = /^0+$/;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command: string, argumentsList: string[]): void {
  console.log(`\n> ${command} ${argumentsList.join(" ")}`);
  const result = spawnSync(command, argumentsList, { stdio: "inherit" });

  if (result.error) {
    console.error(`Unable to run ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function pushedFiles(input: string): Set<string> {
  const files = new Set<string>();

  for (const line of input.trim().split("\n").filter(Boolean)) {
    const [, localObject, , remoteObject] = line.trim().split(/\s+/);
    if (!localObject || zeroObjectPattern.test(localObject)) continue;

    if (!remoteObject || zeroObjectPattern.test(remoteObject)) {
      const branchFiles = splitNullDelimited(
        runGit(["ls-tree", "-r", "--name-only", "-z", localObject]),
      );
      for (const file of branchFiles) {
        files.add(file);
      }
      continue;
    }

    const changedFiles = splitNullDelimited(
      runGit([
        "diff",
        "--name-only",
        "--diff-filter=ACMRD",
        "-z",
        remoteObject,
        localObject,
      ]),
    );
    for (const file of changedFiles) {
      files.add(file);
    }
  }

  return files;
}

const input = readFileSync(0, "utf8");
const files = pushedFiles(input);

run(npmCommand, ["run", "verify:ci"]);

if ([...files].some((file) => file.startsWith("backend/"))) {
  run(npmCommand, ["run", "verify:backend"]);
} else {
  console.log("\nNo backend changes are being pushed; skipping local backend tests.");
}
