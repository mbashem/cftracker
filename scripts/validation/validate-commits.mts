#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { validateCommitMessage } from "./commit-policy.mts";
import { runGit } from "./git.mts";

function failUsage(): never {
  console.error(
    "Usage: validate-commits.mts --file <path> | --commit <revision> | --range <base> <head>",
  );
  process.exit(2);
}

function validate(label: string, message: string): boolean {
  const errors = validateCommitMessage(message);
  if (errors.length === 0) return true;

  console.error(`Invalid commit message (${label}):`);
  console.error(message.split(/\r?\n/, 1)[0]);
  for (const error of errors) console.error(`  - ${error}`);
  return false;
}

function isMergeCommit(revision: string): boolean {
  return runGit(["rev-list", "--parents", "-n", "1", revision])
    .trim()
    .split(/\s+/).length > 2;
}

const [mode, ...argumentsList] = process.argv.slice(2);
let valid = true;

if (mode === "--file" && argumentsList.length === 1) {
  valid = validate(argumentsList[0], readFileSync(argumentsList[0], "utf8"));
} else if (mode === "--commit" && argumentsList.length === 1) {
  const revision = argumentsList[0];
  if (isMergeCommit(revision)) {
    console.log(`Skipping generated merge commit ${revision}.`);
  } else {
    valid = validate(revision, runGit(["show", "-s", "--format=%B", revision]));
  }
} else if (mode === "--range" && argumentsList.length === 2) {
  const [base, head] = argumentsList;
  const commits = runGit([
    "rev-list",
    "--reverse",
    "--no-merges",
    `${base}..${head}`,
  ])
    .trim()
    .split("\n")
    .filter(Boolean);

  for (const commit of commits) {
    const message = runGit(["show", "-s", "--format=%B", commit]);
    valid = validate(commit, message) && valid;
  }
} else {
  failUsage();
}

if (!valid) {
  console.error("See CONTRIBUTING.md#commit-messages for the repository policy.");
  process.exit(1);
}
