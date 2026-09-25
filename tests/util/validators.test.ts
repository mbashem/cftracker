// Disclaimer: Tests in this file have not been thoroughly checked for correctness.
import { expect, test } from "vitest";
import { validateValue, validators } from "../../src/util/validators";

test("trusts the value when no validator is provided", () => {
  const defaultValue = { page: 1 };
  const value = { page: 2 };

  expect(validateValue<string | number>("2", 1)).toBe("2");
  expect(validateValue(value, defaultValue)).toBe(value);
});

test("trusts unvalidated object properties without restoring missing properties", () => {
  const defaultValue = { page: 1, search: "default", enabled: true };

  expect(validateValue(
    { page: "2", search: 3 },
    defaultValue,
    { page: validators.nonNegativeInteger },
  )).toEqual({ page: 2, search: 3 });
});

test("lets validators decide how to handle missing object properties", () => {
  const defaultValue: {
    minContestDate: string | undefined;
    maxContestDate: string | undefined;
    status: string;
  } = {
    minContestDate: "2026-01-01",
    maxContestDate: "2026-06-30",
    status: "SOLVED",
  };

  expect(validateValue(
    { status: "ATTEMPTED" },
    defaultValue,
    {
      minContestDate: validators.date,
      maxContestDate: validators.date,
      status: validators.string,
    },
  )).toEqual({ status: "ATTEMPTED" });
});

test("validates a single enum value", () => {
  const validateTheme = validators.enumValue([1, 2] as const);

  expect(validateTheme(2, 1)).toBe(2);
  expect(validateTheme(3, 1)).toBe(1);
});
