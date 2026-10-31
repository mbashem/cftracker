import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["backend/tests/unit/api-tester/*.vitest.mjs"],
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://tester.example.test/backend/api-tester.html" } },
  },
});
