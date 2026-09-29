// Disclaimer: Tests in this file have not been thoroughly checked for correctness.
import {
  type Dispatch,
  createElement,
  type PropsWithChildren,
  type SetStateAction,
} from "react";
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from "react-router";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";
import useAdvancedState, { type SearchKey } from "../../src/hooks/useAdvancedState";
import { SearchKeys } from "../../src/util/constants";
import { type Validator, type Validators, validators } from "../../src/util/validators";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

interface HookOptions<T> {
  defaultValue: T;
  storageKey?: string;
  searchKey?: SearchKey<T>;
  validator: Validators<T>;
  initialEntry?: string;
}

interface HookResult<T> {
  value: T;
  setValue: Dispatch<SetStateAction<T>>;
  navigate: NavigateFunction;
  search: string;
}

interface RenderedHook<T> {
  readonly current: HookResult<T>;
  setValue: (value: SetStateAction<T>) => Promise<void>;
  navigate: (search: string) => Promise<void>;
  unmount: () => Promise<void>;
}

function createRouterWrapper(initialEntry: string) {
  return function RouterWrapper({ children }: PropsWithChildren) {
    return createElement(MemoryRouter, { initialEntries: [initialEntry] }, children);
  };
}

async function renderAdvancedState<T>(options: HookOptions<T>): Promise<RenderedHook<T>> {
  const renderedHook = renderHook(() => {
    const [value, setValue] = useAdvancedState(
      options.defaultValue,
      options.validator,
      options.storageKey,
      options.searchKey,
    );
    const navigate = useNavigate();
    const { search } = useLocation();
    return { value, setValue, navigate, search };
  }, {
    reactStrictMode: true,
    wrapper: createRouterWrapper(options.initialEntry ?? "/"),
  });

  return {
    get current() {
      return renderedHook.result.current;
    },
    async setValue(value) {
      await act(async () => renderedHook.result.current.setValue(value));
    },
    async navigate(search) {
      await act(async () => renderedHook.result.current.navigate({ search }));
    },
    async unmount() {
      renderedHook.unmount();
    },
  };
}

async function usingAdvancedState<T>(
  options: HookOptions<T>,
  verify: (hook: RenderedHook<T>) => void | Promise<void>,
) {
  const hook = await renderAdvancedState(options);
  try {
    await verify(hook);
  } finally {
    await hook.unmount();
  }
}

test("initializes from the default and synchronizes configured persistence", async () => {
  await usingAdvancedState({
    defaultValue: 3,
    storageKey: "advanced-state",
    searchKey: SearchKeys.Page,
    validator: validators.nonNegativeInteger,
  }, (hook) => {
    expect(hook.current.value).toBe(3);
    expect(localStorage.getItem("advanced-state")).toBe("3");
    expect(new URLSearchParams(hook.current.search).get(SearchKeys.Page)).toBe("3");
  });
});

test("gives the initial URL value priority over storage and saves it", async () => {
  localStorage.setItem("advanced-state", "2");
  const hook = await renderAdvancedState({
    defaultValue: 1,
    storageKey: "advanced-state",
    searchKey: SearchKeys.Page,
    validator: validators.nonNegativeInteger,
    initialEntry: `/?${SearchKeys.Page}=7`,
  });
  try {
    expect(hook.current.value).toBe(7);
    expect(localStorage.getItem("advanced-state")).toBe("7");
  } finally {
    await hook.unmount();
  }
});

test("keeps a valid stored value when the URL value is invalid", async () => {
  localStorage.setItem("advanced-state", "7");
  await usingAdvancedState({
    defaultValue: 1,
    storageKey: "advanced-state",
    searchKey: SearchKeys.Page,
    validator: validators.nonNegativeInteger,
    initialEntry: `/?${SearchKeys.Page}=invalid`,
  }, (hook) => {
    expect(hook.current.value).toBe(7);
    expect(localStorage.getItem("advanced-state")).toBe("7");
    expect(new URLSearchParams(hook.current.search).get(SearchKeys.Page)).toBe("7");
  });
});

test("falls back through invalid URL and storage values to the default", async () => {
  localStorage.setItem("advanced-state", JSON.stringify("invalid"));
  const hook = await renderAdvancedState({
    defaultValue: 4,
    storageKey: "advanced-state",
    searchKey: SearchKeys.Page,
    validator: validators.nonNegativeInteger,
    initialEntry: `/?${SearchKeys.Page}=invalid`,
  });
  try {
    expect(hook.current.value).toBe(4);
    expect(localStorage.getItem("advanced-state")).toBe("4");
    expect(new URLSearchParams(hook.current.search).get(SearchKeys.Page)).toBe("4");
  } finally {
    await hook.unmount();
  }
});

test("validates functional updates before synchronizing storage and the URL", async () => {
  await usingAdvancedState<number>({
    defaultValue: 3,
    storageKey: "advanced-state",
    searchKey: SearchKeys.Page,
    validator: validators.nonNegativeInteger,
  }, async (hook) => {
    await hook.setValue((previousValue) => previousValue + 2);
    expect(hook.current.value).toBe(5);
    expect(localStorage.getItem("advanced-state")).toBe("5");
    expect(new URLSearchParams(hook.current.search).get(SearchKeys.Page)).toBe("5");

    await hook.setValue(-1);
    expect(hook.current.value).toBe(5);
    expect(localStorage.getItem("advanced-state")).toBe("5");
  });
});

test("observes URL changes and back navigation for the same search key", async () => {
  await usingAdvancedState({
    defaultValue: 1,
    storageKey: "advanced-state",
    searchKey: SearchKeys.Page,
    validator: validators.nonNegativeInteger,
    initialEntry: `/?${SearchKeys.Page}=2`,
  }, async (hook) => {
    await hook.navigate(`?${SearchKeys.Page}=8`);
    expect(hook.current.value).toBe(8);
    expect(localStorage.getItem("advanced-state")).toBe("8");
    expect(new URLSearchParams(hook.current.search).get(SearchKeys.Page)).toBe("8");

    await act(async () => hook.current.navigate(-1));
    expect(hook.current.value).toBe(2);
    expect(localStorage.getItem("advanced-state")).toBe("2");
  });
});

test("ignores equal parsed URL records but observes changed values", async () => {
  await usingAdvancedState({
    defaultValue: { page: 1, search: "default" },
    storageKey: "advanced-state",
    searchKey: { page: SearchKeys.Page, search: SearchKeys.Search },
    validator: { page: validators.nonNegativeInteger, search: validators.string },
    initialEntry: `/?${SearchKeys.Page}=7&${SearchKeys.Search}=same`,
  }, async (hook) => {
    const previousValue = hook.current.value;
    await hook.navigate(`?${SearchKeys.Search}=same&${SearchKeys.Page}=7&${SearchKeys.Random}=true`);
    expect(hook.current.value).toBe(previousValue);
    expect(new URLSearchParams(hook.current.search).get(SearchKeys.Random)).toBe("true");

    await hook.navigate(`?${SearchKeys.Search}=changed&${SearchKeys.Page}=7&${SearchKeys.Random}=true`);
    expect(hook.current.value).toEqual({ page: 7, search: "changed" });
    expect(JSON.parse(localStorage.getItem("advanced-state") ?? "")).toEqual({ page: 7, search: "changed" });
    expect(new URLSearchParams(hook.current.search).get(SearchKeys.Random)).toBe("true");
  });
});

test.each([
  {
    scenario: "missing fields",
    searchParams: `${SearchKeys.Search}=url`,
    page: 2,
    search: "url",
    minContestDate: "2026-01-01",
  },
  {
    scenario: "invalid fields",
    searchParams: `${SearchKeys.Search}=url&${SearchKeys.Page}=invalid&${SearchKeys.MinContestDate}=invalid`,
    page: 2,
    search: "url",
    minContestDate: "2026-01-01",
  },
  {
    scenario: "a valid date override",
    searchParams: `${SearchKeys.Search}=url&${SearchKeys.MinContestDate}=2026-03-01`,
    page: 2,
    search: "url",
    minContestDate: "2026-03-01",
  },
  {
    scenario: "valid zero and empty string overrides",
    searchParams: `${SearchKeys.Search}=&${SearchKeys.Page}=0`,
    page: 0,
    search: "",
    minContestDate: "2026-01-01",
  },
])("merges partial URL records over stored object values: $scenario", async ({ searchParams, page, search, minContestDate }) => {
  interface FilterState {
    page: number;
    search: string;
    minContestDate: string | undefined;
    maxContestDate: string | undefined;
  }

  localStorage.setItem("advanced-state", JSON.stringify({
    page: 2,
    search: "stored",
    minContestDate: "2026-01-01",
    maxContestDate: "2026-06-30",
  }));
  const hook = await renderAdvancedState<FilterState>({
    defaultValue: {
      page: 1,
      search: "default",
      minContestDate: undefined,
      maxContestDate: undefined,
    },
    storageKey: "advanced-state",
    searchKey: {
      page: SearchKeys.Page,
      search: SearchKeys.Search,
      minContestDate: SearchKeys.MinContestDate,
      maxContestDate: SearchKeys.MaxContestDate,
    },
    validator: {
      page: validators.nonNegativeInteger,
      search: validators.string,
      minContestDate: validators.date,
      maxContestDate: validators.date,
    },
    initialEntry: `/?${searchParams}`,
  });
  try {
    const expectedValue = {
      page,
      search,
      minContestDate,
      maxContestDate: "2026-06-30",
    };
    expect(hook.current.value).toStrictEqual(expectedValue);
    expect(JSON.parse(localStorage.getItem("advanced-state") ?? "")).toEqual(expectedValue);
    const params = new URLSearchParams(hook.current.search);
    expect(params.get(SearchKeys.MinContestDate)).toBe(minContestDate);
    expect(params.get(SearchKeys.MaxContestDate)).toBe("2026-06-30");

    await hook.navigate(`?${SearchKeys.Search}=updated&${SearchKeys.Page}=invalid&${SearchKeys.MinContestDate}=invalid&${SearchKeys.Random}=true`);
    expect(hook.current.value).toStrictEqual({ ...expectedValue, search: "updated" });
    expect(JSON.parse(localStorage.getItem("advanced-state") ?? "")).toEqual({ ...expectedValue, search: "updated" });
    expect(new URLSearchParams(hook.current.search).get(SearchKeys.Random)).toBe("true");
  } finally {
    await hook.unmount();
  }
});

test("preserves state identity for deeply equal updates with reordered object keys", async () => {
  await usingAdvancedState({
    defaultValue: { page: 1, search: "same" },
    storageKey: "advanced-state",
    searchKey: { page: SearchKeys.Page, search: SearchKeys.Search },
    validator: { page: validators.nonNegativeInteger, search: validators.string },
  }, async (hook) => {
    const previousValue = hook.current.value;
    const previousSearch = hook.current.search;
    await hook.setValue({ search: "same", page: 1 });
    expect(hook.current.value).toBe(previousValue);
    expect(hook.current.search).toBe(previousSearch);
  });
});

test("does not feed unchanged URL values back into inline object state updates", async () => {
  const hook = renderHook(() => {
    const [value, setValue] = useAdvancedState(
      { page: 1 },
      { page: validators.nonNegativeInteger },
      "advanced-state",
      { page: SearchKeys.Page },
    );
    return { value, setValue, search: useLocation().search };
  }, { reactStrictMode: true, wrapper: createRouterWrapper(`/?${SearchKeys.Page}=7`) });

  expect(hook.result.current.value).toEqual({ page: 7 });
  await act(async () => hook.result.current.setValue({ page: 8 }));
  expect(hook.result.current.value).toEqual({ page: 8 });
  expect(new URLSearchParams(hook.result.current.search).get(SearchKeys.Page)).toBe("8");
  expect(JSON.parse(localStorage.getItem("advanced-state") ?? "")).toEqual({ page: 8 });
});

test("does not reload sources when search-key properties are reordered", () => {
  const hook = renderHook(({ reversed }) => {
    const searchKey = reversed
      ? { search: SearchKeys.Search, page: SearchKeys.Page }
      : { page: SearchKeys.Page, search: SearchKeys.Search };
    const [value] = useAdvancedState(
      { page: 1, search: "same" },
      { page: validators.nonNegativeInteger, search: validators.string },
      "advanced-state",
      searchKey,
    );
    return value;
  }, {
    initialProps: { reversed: false },
    reactStrictMode: true,
    wrapper: createRouterWrapper(`/?${SearchKeys.Page}=7&${SearchKeys.Search}=same`),
  });
  const previousValue = hook.result.current;
  localStorage.setItem("advanced-state", JSON.stringify({ page: 9, search: "stored later" }));
  hook.rerender({ reversed: true });
  expect(hook.result.current).toBe(previousValue);
  expect(hook.result.current).toEqual({ page: 7, search: "same" });
});

test("allows explicit state updates to clear optional dates", async () => {
  await usingAdvancedState<{ minContestDate: string | undefined; maxContestDate: string | undefined }>({
    defaultValue: { minContestDate: "2026-01-01", maxContestDate: "2026-06-30" },
    storageKey: "advanced-state",
    searchKey: { minContestDate: SearchKeys.MinContestDate, maxContestDate: SearchKeys.MaxContestDate },
    validator: { minContestDate: validators.date, maxContestDate: validators.date },
  }, async (hook) => {
    await hook.setValue((previousValue) => ({ ...previousValue, minContestDate: undefined }));
    expect(hook.current.value).toStrictEqual({ minContestDate: undefined, maxContestDate: "2026-06-30" });
    expect(JSON.parse(localStorage.getItem("advanced-state") ?? "")).toEqual({ maxContestDate: "2026-06-30" });
    const params = new URLSearchParams(hook.current.search);
    expect(params.has(SearchKeys.MinContestDate)).toBe(false);
    expect(params.get(SearchKeys.MaxContestDate)).toBe("2026-06-30");
  });
});

test("applies validator arrays from left to right", async () => {
  const atMostTen: Validator<number> = (value, defaultValue) => {
    return typeof value === "number" && value <= 10 ? value : defaultValue;
  };

  await usingAdvancedState({
    defaultValue: 5,
    searchKey: SearchKeys.Page,
    validator: [validators.nonNegativeInteger, atMostTen],
    initialEntry: `/?${SearchKeys.Page}=7`,
  }, async (hook) => {
    expect(hook.current.value).toBe(7);

    await hook.setValue(11);
    expect(hook.current.value).toBe(7);
  });
});

test("does not use persistence when its corresponding key is absent", async () => {
  await usingAdvancedState({
    defaultValue: 1,
    validator: validators.nonNegativeInteger,
  }, async (hook) => {
    await hook.setValue(2);
    expect(hook.current.value).toBe(2);
    expect(localStorage.length).toBe(0);
    expect(hook.current.search).toBe("");
  });
});

test.each([
  { urlValue: "9", expected: 9 },
  { urlValue: "invalid", expected: 3 },
])("resolves changed storage and search keys with URL value $urlValue", ({ urlValue, expected }) => {
  localStorage.setItem("first-state", "2");
  localStorage.setItem("second-state", "3");
  const renderedHook = renderHook(({ storageKey, searchKey }) => {
    const [value] = useAdvancedState(1, validators.nonNegativeInteger, storageKey, searchKey);
    return { value, search: useLocation().search };
  }, {
    initialProps: {
      storageKey: "first-state",
      searchKey: SearchKeys.Page,
    },
    reactStrictMode: true,
    wrapper: createRouterWrapper(`/?${SearchKeys.Page}=7&${SearchKeys.MaxRating}=${urlValue}`),
  });

  expect(renderedHook.result.current.value).toBe(7);
  renderedHook.rerender({
    storageKey: "second-state",
    searchKey: SearchKeys.MaxRating,
  });

  expect(renderedHook.result.current.value).toBe(expected);
  expect(localStorage.getItem("second-state")).toBe(String(expected));
});

test("reads the latest stored value when only the storage key changes", () => {
  localStorage.setItem("first-state", "2");
  localStorage.setItem("second-state", "3");
  const renderedHook = renderHook(({ storageKey }) => {
    const [value] = useAdvancedState(1, validators.nonNegativeInteger, storageKey, undefined);
    return value;
  }, {
    initialProps: { storageKey: "first-state" },
    reactStrictMode: true,
    wrapper: createRouterWrapper("/"),
  });

  localStorage.setItem("second-state", "5");
  renderedHook.rerender({ storageKey: "second-state" });

  expect(renderedHook.result.current).toBe(5);
  expect(localStorage.getItem("second-state")).toBe("5");
});

test("reads the latest URL value when only the search key changes", () => {
  const renderedHook = renderHook(({ searchKey }) => {
    const [value] = useAdvancedState(1, validators.nonNegativeInteger, undefined, searchKey);
    return value;
  }, {
    initialProps: { searchKey: SearchKeys.Page },
    reactStrictMode: true,
    wrapper: createRouterWrapper(`/?${SearchKeys.Page}=7&${SearchKeys.MaxRating}=9`),
  });

  expect(renderedHook.result.current).toBe(7);
  renderedHook.rerender({ searchKey: SearchKeys.MaxRating });
  expect(renderedHook.result.current).toBe(9);
});

test("synchronizes the current value when an optional key is enabled", () => {
  const renderedHook = renderHook(({ storageKey, searchKey }) => {
    const [value] = useAdvancedState(3, validators.nonNegativeInteger, storageKey, searchKey);
    return { value, search: useLocation().search };
  }, {
    initialProps: {
      storageKey: undefined as string | undefined,
      searchKey: undefined as SearchKeys | undefined,
    },
    reactStrictMode: true,
    wrapper: createRouterWrapper("/"),
  });

  renderedHook.rerender({
    storageKey: undefined,
    searchKey: SearchKeys.Page,
  });
  expect(new URLSearchParams(renderedHook.result.current.search).get(SearchKeys.Page)).toBeNull();

  localStorage.setItem("enabled-state", "6");
  renderedHook.rerender({
    storageKey: "enabled-state",
    searchKey: SearchKeys.Page,
  });
  expect(renderedHook.result.current.value).toBe(6);
  expect(new URLSearchParams(renderedHook.result.current.search).get(SearchKeys.Page)).toBe("6");
});
