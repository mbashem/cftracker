import assert from "node:assert/strict";
import test from "node:test";
import { validateCommitMessage } from "./commit-policy.mts";

const validMessages = [
  "feat: add list export",
  "fix(auth): reject mismatched OAuth state",
  "chore(data-cache): update Codeforces snapshots",
  `docs: ${"a".repeat(72)}`,
  "fix: preserve GitHub OAuth state\r\n\r\nVerified locally.",
  "feat(api)!: remove legacy route\n\nBREAKING CHANGE: clients must use /api/v2",
];

for (const message of validMessages) {
  test(`accepts ${JSON.stringify(message.split("\n")[0])}`, () => {
    assert.deepEqual(validateCommitMessage(message), []);
  });
}

const invalidMessages = [
  "Bot: data upd",
  "feature: add list export",
  "fix(Auth): reject mismatched state",
  "fix: Reject mismatched state",
  "fix: reject mismatched state.",
  "fix: reject mismatched state ",
  `fix: ${"a".repeat(73)}`,
  "fix: reject mismatched state\nwithout a blank line",
  "feat!: remove legacy route",
  "feat: remove legacy route\n\nBREAKING CHANGE: clients must use /api/v2",
];

for (const message of invalidMessages) {
  test(`rejects ${JSON.stringify(message.split("\n")[0])}`, () => {
    assert.notDeepEqual(validateCommitMessage(message), []);
  });
}
