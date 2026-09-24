import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "../../src/App";
import useProblemPage from "../../src/components/problem/useProblemPage";
import useContestPage from "../../src/components/contest/useContestPage";
import Contest from "../../src/types/CF/Contest";
import Problem from "../../src/types/CF/Problem";
import { Verdict } from "../../src/types/CF/Submission";
import { StorageService } from "../../src/util/StorageService";
import { SearchKeys } from "../../src/util/constants";
import { Path } from "../../src/util/route/path";

const data = vi.hoisted(() => ({ problems: [] as Problem[], submissions: [], contests: [] as Contest[], loading: false }));
vi.mock("../../src/data/hooks/useSubmissionsStore", () => ({ default: () => ({ submissions: data.submissions }) }));
vi.mock("../../src/data/hooks/useTheme", () => ({ default: () => ({ theme: {} }) }));
vi.mock("../../src/data/hooks/useListApi", () => ({
  default: () => ({ getListWithItems: async (id: number) => ({ id, name: "Test list", items: [] }) }),
}));
vi.mock("../../src/data/hooks/useProblemsStore", () => ({
  default: () => ({ problemList: { problems: data.problems, tags: [], loading: data.loading } }),
}));
vi.mock("../../src/data/hooks/useAppStateStore", () => ({
  default: () => ({ appState: { minRating: 0, maxRating: 4000, minContestId: 1, maxContestId: 4000 } }),
}));
vi.mock("../../src/data/hooks/useContestStore", () => ({ default: () => ({ contests: data.contests, loading: data.loading }) }));
vi.mock("../../src/hooks/useToast", () => ({ default: () => ({ showErrorToast: vi.fn() }) }));
vi.mock("../../src/hooks/useAppBootstrap", () => ({ default: () => {} }));
vi.mock("../../src/components/Menu", () => ({ default: () => null }));
vi.mock("../../src/components/home/HomePage", () => ({ default: () => null }));
vi.mock("../../src/components/contest/ContestPage", () => ({ default: () => { contestPage = useContestPage(); return null; } }));
vi.mock("../../src/util/route/AuthGuard", () => ({ default: () => null }));
vi.mock("../../src/components/problem/ProblemPage", () => ({
  default: () => {
    page = useProblemPage();
    return null;
  },
}));

let page: ReturnType<typeof useProblemPage>;
let contestPage: ReturnType<typeof useContestPage>;
let navigate: NavigateFunction;
let location: ReturnType<typeof useLocation>;

function NavigationProbe() {
  navigate = useNavigate();
  location = useLocation();
  return null;
}

function TestApp({ initialEntry }: { initialEntry: string }) {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <NavigationProbe />
      <App />
    </MemoryRouter>
  );
}

const savedFilter = {
  minRating: 1200,
  maxRating: 1600,
  minContestId: 100,
  maxContestId: 200,
  tags: ["dp"],
  solveStatus: [Verdict.UNSOLVED],
  selected: 0,
  search: "saved",
};

beforeEach(() => {
  localStorage.clear();
  StorageService.saveObject(StorageService.Keys.Problem.State, savedFilter);
  data.loading = false;
  data.contests = [100, 101].map((id) => {
    const contest = new Contest(id, `Codeforces Round ${id} (${id === 100 ? "one" : "two"}, Div. 2)`, "CF", "FINISHED", 7200, 1000);
    contest.count = 1;
    return contest;
  });
  data.problems = [
    new Problem(100, "A", "saved one", "PROGRAMMING", 1200, ["dp"]),
    new Problem(101, "A", "saved two", "PROGRAMMING", 1400, ["dp"]),
    new Problem(2, "A", "temporary", "PROGRAMMING", 800, []),
  ];
});
afterEach(cleanup);


function randomPage(kind: "problem" | "contest") {
  return kind === "problem" ? {
    isRandomActive: page.isRandomActive,
    count: page.currentPageProblems.length,
    choose: page.setRandomProblem,
    updateSearch: (search: string) => page.updateFilter({ search }),
  } : {
    isRandomActive: contestPage.isRandomActive,
    count: contestPage.currentPageContests.length,
    choose: contestPage.setRandomContest,
    updateSearch: (search: string) => contestPage.updateFilter({ search }),
  };
}

test.each(["problem", "contest"] as const)("%s keeps the random flag through filter changes and cancels to its main page", async (kind) => {
  const mainPath = kind === "problem" ? Path.PROBLEMS : Path.CONTESTS;
  const randomPath = kind === "problem" ? Path.RANDOM_PROBLEM : Path.CONTESTS;
  render(<TestApp initialEntry={`${randomPath}?random=true&useFilterStorage=false`} />, { reactStrictMode: true });
  expect(randomPage(kind).isRandomActive).toBe(true);
  expect(randomPage(kind).count).toBe(1);
  expect(new URLSearchParams(location.search).get(SearchKeys.Random)).toBe("true");

  await act(async () => randomPage(kind).updateSearch("one"));
  expect(randomPage(kind).isRandomActive).toBe(true);
  expect(randomPage(kind).count).toBe(1);
  expect(new URLSearchParams(location.search).get(SearchKeys.Random)).toBe("true");

  await act(async () => randomPage(kind).updateSearch("no matching results"));
  expect(randomPage(kind).count).toBe(0);
  expect(new URLSearchParams(location.search).get(SearchKeys.Random)).toBe("true");
  await act(async () => randomPage(kind).updateSearch("one"));
  expect(randomPage(kind).isRandomActive).toBe(true);

  await act(async () => randomPage(kind).choose(undefined));
  expect(location.pathname).toBe(mainPath);
  expect(new URLSearchParams(location.search).has(SearchKeys.Random)).toBe(false);
  expect(randomPage(kind).isRandomActive).toBe(false);
  await act(async () => randomPage(kind).updateSearch("two"));
  expect(randomPage(kind).isRandomActive).toBe(false);
});

test.each(["problem", "contest"] as const)("%s toolbar random selection is represented in the URL and can be cancelled", async (kind) => {
  const path = kind === "problem" ? Path.PROBLEMS : Path.CONTESTS;
  render(<TestApp initialEntry={path} />, { reactStrictMode: true });
  await act(async () => randomPage(kind).choose(0));
  expect(new URLSearchParams(location.search).get(SearchKeys.Random)).toBe("true");
  expect(randomPage(kind).count).toBe(1);
  await act(async () => randomPage(kind).choose(undefined));
  expect(location.pathname).toBe(path);
  expect(new URLSearchParams(location.search).has(SearchKeys.Random)).toBe(false);
  expect(randomPage(kind).isRandomActive).toBe(false);
});

test("returning from temporary snapshot filters reloads saved preferences on the same route", async () => {
  render(<TestApp initialEntry="/problems?useFilterStorage=false&minContestId=2&maxContestId=2" />, { reactStrictMode: true });
  await act(async () => page.updateFilter({ search: "temporary" }));
  expect(StorageService.getObject(StorageService.Keys.Problem.State, {})).toEqual(savedFilter);
  await act(async () => navigate(Path.PROBLEMS));
  expect(page.filter).toMatchObject(savedFilter);
  await act(async () => page.updateFilter({ search: "updated" }));
  expect(StorageService.getObject(StorageService.Keys.Problem.State, {})).toMatchObject({ ...savedFilter, search: "updated" });
});

test("storage key changes apply the latest stored value and disabling resets defaults", async () => {
  render(<TestApp initialEntry="/problems?useFilterStorage=false&minContestId=2&maxContestId=2" />, { reactStrictMode: true });
  const latestFilter = { ...savedFilter, minRating: 1800, maxRating: 2000, search: "latest" };
  StorageService.saveObject(StorageService.Keys.Problem.State, latestFilter);
  const search = new URLSearchParams(location.search);
  search.set(SearchKeys.UseFilterStorage, "true");
  await act(async () => navigate({ search: search.toString() }));
  expect(page.filter).toMatchObject(latestFilter);
  expect(new URLSearchParams(location.search).get(SearchKeys.MinRating)).toBe("1800");
  expect(StorageService.getObject(StorageService.Keys.Problem.State, {})).toMatchObject(latestFilter);

  search.set(SearchKeys.UseFilterStorage, "false");
  await act(async () => navigate({ search: search.toString() }));
  expect(page.filter).toMatchObject({ minRating: 0, maxRating: 4000, minContestId: 1, maxContestId: 4000, search: "" });
  expect(StorageService.getObject(StorageService.Keys.Problem.State, {})).toMatchObject(latestFilter);
});

test.each(["problem", "contest"] as const)("%s waits for data while keeping random mode in the URL", async (kind) => {
  data.loading = true;
  const path = kind === "problem" ? Path.RANDOM_PROBLEM : Path.CONTESTS;
  const entry = `${path}?random=true&useFilterStorage=false`;
  const view = render(<TestApp initialEntry={entry} />, { reactStrictMode: true });
  expect(randomPage(kind).isRandomActive).toBe(false);
  expect(new URLSearchParams(location.search).get(SearchKeys.Random)).toBe("true");
  data.loading = false;
  view.rerender(<TestApp initialEntry={entry} />);
  expect(randomPage(kind).isRandomActive).toBe(true);
  expect(randomPage(kind).count).toBe(1);
});
