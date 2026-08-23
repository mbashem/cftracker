#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { ESLint } from "eslint";
import { checkStagedHygiene } from "./check-repository-hygiene.mts";
import { stagedFile, stagedFiles } from "./git.mts";

const require = createRequire(import.meta.url);
const secretlintPackagePath = require.resolve("secretlint/package.json");
const secretlintCliPath = path.join(
  path.dirname(secretlintPackagePath),
  "bin",
  "secretlint.js",
);

function fail(message: string): void {
  console.error(message);
  process.exitCode = 1;
}

function checkWhitespace(): void {
  const result = spawnSync("git", ["diff", "--cached", "--check"], {
    encoding: "utf8",
  });

  if (result.error) {
    fail(`Unable to check staged whitespace: ${result.error.message}`);
    return;
  }
  if (result.status !== 0) {
    fail(result.stdout.trim() || result.stderr.trim() || "Staged whitespace check failed.");
  }
}

function checkGoFormatting(files: string[]): void {
  for (const file of files.filter(
    (candidate) => candidate.startsWith("backend/") && candidate.endsWith(".go"),
  )) {
    const content = stagedFile(file);
    const formatted = spawnSync("gofmt", [], { input: content });

    if (formatted.error) {
      fail(`Unable to format-check ${file}: ${formatted.error.message}`);
      continue;
    }
    if (formatted.status !== 0) {
      fail(`gofmt failed for ${file}: ${String(formatted.stderr).trim()}`);
      continue;
    }
    if (!content.equals(formatted.stdout)) {
      fail(`${file}: staged Go source is not gofmt-formatted`);
    }
  }
}

function checkSecrets(files: string[]): void {
  for (const file of files) {
    const content = stagedFile(file);
    if (content.includes(0)) continue;

    const result = spawnSync(
      process.execPath,
      [
        secretlintCliPath,
        `--stdinFileName=${file}`,
        "--no-color",
        "--no-terminalLink",
      ],
      { encoding: "utf8", input: content },
    );

    if (result.error) {
      fail(`Unable to scan ${file} with Secretlint: ${result.error.message}`);
      continue;
    }
    if (result.status !== 0) {
      fail(
        result.stdout.trim() ||
          result.stderr.trim() ||
          `Secretlint failed for ${file}.`,
      );
    }
  }
}

function isRootLintCandidate(file: string): boolean {
  if (file === "vite.config.mts") return true;
  return file.startsWith("src/") && /\.(?:ts|tsx)$/.test(file);
}

async function checkRootLint(files: string[]): Promise<void> {
  const candidates = files.filter(isRootLintCandidate);
  if (candidates.length === 0) return;

  const eslint = new ESLint({
    cwd: process.cwd(),
    flags: ["unstable_native_nodejs_ts_config"],
  });
  const results: Awaited<ReturnType<ESLint["lintText"]>> = [];

  for (const file of candidates) {
    if (await eslint.isPathIgnored(file)) continue;
    results.push(
      ...(await eslint.lintText(stagedFile(file).toString("utf8"), {
        filePath: file,
        warnIgnored: false,
      })),
    );
  }

  const errors = results.reduce(
    (total, result) => total + result.errorCount,
    0,
  );
  const warnings = results.reduce(
    (total, result) => total + result.warningCount,
    0,
  );
  if (errors === 0 && warnings === 0) return;

  const formatter = await eslint.loadFormatter("stylish");
  fail(await formatter.format(results));
}

const files = stagedFiles();
checkWhitespace();

const hygieneViolations = checkStagedHygiene();
if (hygieneViolations.length > 0) {
  fail(
    `Repository hygiene check failed:\n${hygieneViolations.map((violation) => `  - ${violation}`).join("\n")}`,
  );
}

checkSecrets(files);
checkGoFormatting(files);
await checkRootLint(files);

if (process.exitCode) {
  console.error("Commit blocked. Fix the staged changes and try again.");
}
