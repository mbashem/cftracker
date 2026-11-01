import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { resetFrontendMocks } from "./frontendMocks";

// Register inside suites that use frontendMocks, before any scenario hooks.
export function setupFrontendTests(seed?: () => void) {
  beforeEach(() => {
    resetFrontendMocks();
    localStorage.clear();
    seed?.();
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });
}
