#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { stagedFiles, trackedFiles } from "./git.mts";
import { validateRepositoryPath } from "./repository-hygiene.mts";

export function checkPaths(files: string[]): string[] {
  const violations: string[] = [];

  for (const file of files) {
    for (const error of validateRepositoryPath(file)) {
      violations.push(`${file}: ${error}`);
    }
  }

  return violations;
}

export function checkStagedHygiene(): string[] {
  return checkPaths(stagedFiles());
}

export function checkTrackedHygiene(revision = "HEAD"): string[] {
  return checkPaths(trackedFiles(revision));
}

function printViolations(violations: string[]): void {
  if (violations.length === 0) return;

  console.error("Repository hygiene check failed:");
  for (const violation of violations) console.error(`  - ${violation}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [mode] = process.argv.slice(2);
  let violations;

  if (mode === "--staged") {
    violations = checkStagedHygiene();
  } else if (mode === "--tracked") {
    violations = checkTrackedHygiene();
  } else {
    console.error("Usage: check-repository-hygiene.mts --staged | --tracked");
    process.exit(2);
  }

  printViolations(violations);
  if (violations.length > 0) process.exit(1);
}
