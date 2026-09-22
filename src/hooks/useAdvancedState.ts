import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from "react";
import useSearchParamState, { type SearchKey } from "./useSearchParamState";
import { StorageService } from "../util/StorageService";
import { validateValue, type Validators } from "../util/validators";

export type { SearchKey, SearchRecord } from "./useSearchParamState";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && !(value instanceof Set)
    && !(value instanceof Map);
}

function mergeValue<T>(baseValue: T, value: unknown): T {
  return isPlainObject(baseValue) && isPlainObject(value)
    ? { ...baseValue, ...value } as T
    : value as T;
}

function useAdvancedState<T>(
  defaultValue: T,
  storageKey?: string,
  searchKey?: SearchKey<T>,
  validator?: Validators<T>,
): [T, Dispatch<SetStateAction<T>>] {
  const [searchValue, setSearchValue] = useSearchParamState<T>(searchKey);
  const [value, setValue] = useState(() => {
    const storedValue = storageKey === undefined
      ? defaultValue
      : validateValue(StorageService.getValue(storageKey, defaultValue), defaultValue, validator);
    if (searchValue === undefined) return storedValue;
    return validateValue(mergeValue(storedValue, searchValue), storedValue, validator);
  });
  const setSafeValue = useCallback((nextValue: unknown) => {
    setValue((previousValue) => {
      const candidateValue = typeof nextValue === "function"
        ? (nextValue as (previousValue: T) => T)(previousValue)
        : nextValue;
      return validateValue(candidateValue, previousValue, validator);
    });
  }, [validator]);

  useEffect(() => {
    if (searchValue === undefined) return;
    setSafeValue((currentValue: T) => mergeValue(currentValue, searchValue));
  }, [searchValue]);

  useEffect(() => {
    if (storageKey !== undefined) StorageService.saveValue(storageKey, value);
    setSearchValue(value);
  }, [value]);

  return [value, setSafeValue];
}

export default useAdvancedState;
