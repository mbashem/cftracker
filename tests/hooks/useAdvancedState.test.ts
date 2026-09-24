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
import { type Validators, validators } from "../../src/util/validators";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

interface HookOptions<T> {
  defaultValue: T;
  storageKey?: string;
  searchKey?: SearchKey<T>;
  validator?: Validators<T>;
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
      options.storageKey,
      options.searchKey,
      options.validator,
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

test("reads a search key once until the key changes", async () => {
  await usingAdvancedState({
    defaultValue: 1,
    storageKey: "advanced-state",
    searchKey: SearchKeys.Page,
    validator: validators.nonNegativeInteger,
    initialEntry: `/?${SearchKeys.Page}=2`,
  }, async (hook) => {
    await hook.navigate(`?${SearchKeys.Page}=8`);
    expect(hook.current.value).toBe(2);
    expect(localStorage.getItem("advanced-state")).toBe("2");
    expect(new URLSearchParams(hook.current.search).get(SearchKeys.Page)).toBe("8");
  });
});

test("merges partial URL records over stored object values", async () => {
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
    initialEntry: `/?${SearchKeys.Search}=url`,
  });
  try {
    expect(hook.current.value).toEqual({
      page: 2,
      search: "url",
      minContestDate: "2026-01-01",
      maxContestDate: "2026-06-30",
    });
    expect(JSON.parse(localStorage.getItem("advanced-state") ?? "")).toEqual({
      page: 2,
      search: "url",
      minContestDate: "2026-01-01",
      maxContestDate: "2026-06-30",
    });
  } finally {
    await hook.unmount();
  }
});

test("applies validator arrays from left to right", async () => {
  const atMostTen = (value: unknown, defaultValue: number) => {
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

test("applies changed storage and search keys in order with search taking priority", () => {
  localStorage.setItem("first-state", "2");
  localStorage.setItem("second-state", "3");
  const renderedHook = renderHook(({ storageKey, searchKey }) => {
    const [value] = useAdvancedState(1, storageKey, searchKey, validators.nonNegativeInteger);
    return { value, search: useLocation().search };
  }, {
    initialProps: {
      storageKey: "first-state",
      searchKey: SearchKeys.Page,
    },
    reactStrictMode: true,
    wrapper: createRouterWrapper(`/?${SearchKeys.Page}=7&${SearchKeys.MaxRating}=9`),
  });

  expect(renderedHook.result.current.value).toBe(7);
  renderedHook.rerender({
    storageKey: "second-state",
    searchKey: SearchKeys.MaxRating,
  });

  expect(renderedHook.result.current.value).toBe(9);
  expect(localStorage.getItem("second-state")).toBe("9");
});

test("reads the latest stored value when only the storage key changes", () => {
  localStorage.setItem("first-state", "2");
  localStorage.setItem("second-state", "3");
  const renderedHook = renderHook(({ storageKey }) => {
    const [value] = useAdvancedState(1, storageKey, undefined, validators.nonNegativeInteger);
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
    const [value] = useAdvancedState(1, undefined, searchKey, validators.nonNegativeInteger);
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
    const [value] = useAdvancedState(3, storageKey, searchKey, validators.nonNegativeInteger);
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
