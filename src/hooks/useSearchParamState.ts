import { useCallback, useMemo } from "react";
import { SearchKeys } from "../util/constants";
import useAppSearchParams from "./useSearchParam";

export type SearchRecord<T> = Partial<Record<keyof T, SearchKeys>>;
export type SearchKey<T> = T extends object ? SearchKeys | SearchRecord<T> : SearchKeys;
export type SetSearchParamState<T> = (value: T | undefined) => void;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && !(value instanceof Set)
    && !(value instanceof Map);
}

function parseSearchValue(value: string): unknown {
  if (!value.startsWith("{")) return value;
  try {
    const parsedValue: unknown = JSON.parse(value);
    return isPlainObject(parsedValue) ? parsedValue : value;
  } catch {
    return value;
  }
}

function formatSearchValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) return value.join(",");
  if (value instanceof Set) return [...value].join(",");
  if (isPlainObject(value)) return JSON.stringify(value);
  return String(value);
}

function useSearchParamState<T>(searchKey?: SearchKey<T>): [unknown | undefined, SetSearchParamState<T>] {
  const { getSearchParam, getSearchParams, updateSearchParams } = useAppSearchParams();
  const searchValue = useMemo(() => {
    if (searchKey === undefined) return undefined;
    if (typeof searchKey === "string") {
      const value = getSearchParam(searchKey);
      return value === undefined ? undefined : parseSearchValue(value);
    }

    const entries = (Object.entries(searchKey) as Array<[keyof T, SearchKeys | undefined]>)
      .filter((entry): entry is [keyof T, SearchKeys] => entry[1] !== undefined);
    const values = getSearchParams(entries.map(([, key]) => key));
    if (values.size === 0) return undefined;

    const value: Partial<Record<keyof T, string>> = {};
    for (const [property, key] of entries) {
      const propertyValue = values.get(key);
      if (propertyValue !== undefined) value[property] = propertyValue;
    }
    return value;
  }, [getSearchParam, getSearchParams, searchKey]);

  const setSearchValue = useCallback<SetSearchParamState<T>>((value) => {
    if (searchKey === undefined) return;

    const updates = new Map<SearchKeys, string | undefined>();
    if (typeof searchKey === "string") {
      updates.set(searchKey, formatSearchValue(value));
    } else {
      const searchRecord = searchKey as SearchRecord<T>;
      const valueRecord = isPlainObject(value) ? value : undefined;
      for (const property of Object.keys(searchRecord) as Array<keyof T>) {
        const propertySearchKey = searchRecord[property];
        if (propertySearchKey === undefined) continue;
        const propertyValue = valueRecord?.[property as string];
        updates.set(propertySearchKey, formatSearchValue(propertyValue));
      }
    }
    updateSearchParams(updates);
  }, [searchKey, updateSearchParams]);

  return [searchValue, setSearchValue];
}

export default useSearchParamState;
