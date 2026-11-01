import type { ListItem, ListWithItem } from "../../src/types/list";

export function createListItem(overrides: Partial<ListItem> = {}): ListItem {
  return { listId: 5, problemId: "100A", position: 0, createdAt: "2026-01-01", ...overrides };
}

export function createList(overrides: Partial<ListWithItem> = {}): ListWithItem {
  return {
    id: 5, userId: 1, name: "Practice", createdAt: "2026-01-01", ...overrides,
    items: (overrides.items ?? []).map(item => ({ ...item })),
  };
}
