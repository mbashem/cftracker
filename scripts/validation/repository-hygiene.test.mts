import assert from "node:assert/strict";
import test from "node:test";
import { validateRepositoryPath } from "./repository-hygiene.mts";

test("allows environment templates", () => {
  assert.deepEqual(validateRepositoryPath("backend/.env.example"), []);
});

test("rejects local environment and log files", () => {
  assert.notDeepEqual(validateRepositoryPath(".env.local"), []);
  assert.notDeepEqual(validateRepositoryPath("debug.log"), []);
});
