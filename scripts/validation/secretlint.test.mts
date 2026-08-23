import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const secretlintPackagePath = require.resolve("secretlint/package.json");
const secretlintCliPath = path.join(
  path.dirname(secretlintPackagePath),
  "bin",
  "secretlint.js",
);

test("Secretlint detects a representative provider token", () => {
  const fakeGitHubToken = ["gh", "p_", "a".repeat(36)].join("");
  const result = spawnSync(
    process.execPath,
    [secretlintCliPath, "--stdinFileName=secret.txt", "--no-color"],
    { encoding: "utf8", input: fakeGitHubToken },
  );

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stdout, /GitHub/i);
});
