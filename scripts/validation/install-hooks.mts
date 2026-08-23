#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const insideWorkTree = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
});

if (insideWorkTree.status !== 0 || insideWorkTree.stdout.trim() !== "true") {
  console.log("Skipping Git hook installation outside a Git worktree.");
  process.exit(0);
}

const configured = spawnSync(
  "git",
  ["config", "--local", "core.hooksPath", ".githooks"],
  { stdio: "inherit" },
);

if (configured.error) {
  console.error(`Unable to configure Git hooks: ${configured.error.message}`);
  process.exit(1);
}

if (configured.status !== 0) {
  process.exit(configured.status ?? 1);
}

console.log("Git hooks enabled from .githooks.");
