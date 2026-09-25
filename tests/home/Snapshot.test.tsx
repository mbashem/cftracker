// Disclaimer: Tests in this file have not been thoroughly checked for correctness.
import { fireEvent, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import Snapshot from "../../src/components/home/Snapshot";
import { SnapshotPeriod } from "../../src/components/home/homeStatistics";
import { Verdict } from "../../src/types/CF/Submission";
import { SearchKeys } from "../../src/util/constants";
import { Path } from "../../src/util/route/path";

vi.mock("../../src/data/hooks/useTheme", () => ({
  default: () => ({ theme: {} }),
}));

afterEach(cleanup);

function LocationProbe() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname}{search}</output>;
}

test("active days link includes solved and attempted submissions", () => {
  render(
    <MemoryRouter>
      <Snapshot
        statistics={{
          solvedCount: 1,
          activeDays: 2,
          averageSolvedRating: undefined,
          attemptedUnsolvedCount: 1,
          solvedProblems: [],
          attemptedUnsolvedProblems: [],
        }}
        statisticDetails={{
          solvedContestRange: { min: 100, max: 150 },
          submittedContestRange: { min: 90, max: 200 },
          attemptedContestRange: { min: 90, max: 200 },
        }}
        period={SnapshotPeriod.WEEK}
        range={{ startTimeSeconds: 1_000, endTimeSeconds: 2_000 }}
        customRange={{}}
        hasHandles
        hasSubmissions
        hasError={false}
        isLoading={false}
        onPeriodChange={vi.fn()}
        onCustomRangeChange={vi.fn()}
      />
      <LocationProbe />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole("button", { name: /Active days/i }));

  const location = screen.getByTestId("location").textContent ?? "";
  const [path, search] = location.split("?");
  const params = new URLSearchParams(search);
  expect(path).toBe(Path.PROBLEMS);
  expect(params.get(SearchKeys.Status)).toBe(`${Verdict.SOLVED},${Verdict.ATTEMPTED}`);
  expect(params.get(SearchKeys.SubmittedAfter)).toBe("1000");
  expect(params.get(SearchKeys.SubmittedBefore)).toBe("2000");
  expect(params.get(SearchKeys.MinContestId)).toBe("90");
  expect(params.get(SearchKeys.MaxContestId)).toBe("200");
  expect(params.get(SearchKeys.UseFilterStorage)).toBe("false");
});
