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

test("reacts to URL changes and persists the new value", async () => {
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
  });
});

test("merges partial URL records over stored object values", async () => {
  interface FilterState {
    page: number;
    search: string;
  }

  localStorage.setItem("advanced-state", JSON.stringify({ page: 2, search: "stored" }));
  const hook = await renderAdvancedState<FilterState>({
    defaultValue: { page: 1, search: "default" },
    storageKey: "advanced-state",
    searchKey: {
      page: SearchKeys.Page,
      search: SearchKeys.Search,
    },
    validator: {
      page: validators.nonNegativeInteger,
      search: validators.string,
    },
    initialEntry: `/?${SearchKeys.Search}=url`,
  });
  try {
    expect(hook.current.value).toEqual({ page: 2, search: "url" });
    expect(JSON.parse(localStorage.getItem("advanced-state") ?? "")).toEqual({
      page: 2,
      search: "url",
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
