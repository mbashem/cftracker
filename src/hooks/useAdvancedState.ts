import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import useSearchParamState, { type SearchKey } from "./useSearchParamState";
import { StorageService } from "../util/StorageService";
import { isDefined, isEqual, isNotEqual, isPlainObject, mergeValue, removeUndefinedFields, } from "../util/util";
import { validateValue, type Validators } from "../util/validators";

export type { SearchKey, SearchRecord } from "./useSearchParamState";

/**
 * Initializes with the default, then resolves configured sources in order:
 * storage first and URL search second, so search has higher priority when both
 * sources change. Each source is validated against the previous value, letting
 * invalid URL entries retain valid stored values. Each source is read once
 * initially and again when its key changes.
 * After resolution, every validated state change is synchronized to the currently
 * configured storage and search keys. Omitting a key disables that source.
 */
function useAdvancedState<T>(
  defaultValue: T,
  validator: Validators<T>,
  storageKey?: string,
  searchKey?: SearchKey<T>,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(defaultValue);
  const lastStorageKey = useRef<string | undefined>(undefined);
  const lastSearchKey = useRef<SearchKey<T> | undefined>(undefined);
  const [searchValue, setSearchValue] = useSearchParamState(searchKey, validator);

  const setSafeValue = useCallback((nextValue: unknown) => {
    setValue((previousValue) => {
      const candidateValue = typeof nextValue === "function"
        ? (nextValue as (previousValue: T) => T)(previousValue)
        : nextValue;
      let validatedValue = validateValue(candidateValue, previousValue, validator);
      if (isEqual(validatedValue, previousValue)) return previousValue;
      return validatedValue;
    });
  }, [validator]);

  useEffect(() => {
    let updatedValue = false;
    let resolvedValue: T = value;
    if (isNotEqual(lastStorageKey.current, storageKey)) {
      lastStorageKey.current = storageKey;
      if (isDefined(storageKey)) {
        updatedValue = true;
        resolvedValue = validateValue(StorageService.getValue(storageKey, value), resolvedValue, validator);
      }
    }

    if (isNotEqual(lastSearchKey.current, searchKey)) {
      lastSearchKey.current = searchKey;
      if (isDefined(searchKey) && isDefined(searchValue)) {
        updatedValue = true;
        let validatedSearchValue = validateValue(searchValue, resolvedValue, validator);
        const searchOverrides = isPlainObject(validatedSearchValue)
          ? removeUndefinedFields(validatedSearchValue)
          : validatedSearchValue;
        resolvedValue = mergeValue(resolvedValue, searchOverrides);
      }
    }

    if (updatedValue) setSafeValue(resolvedValue);
  }, [storageKey, searchKey]);

  useEffect(() => {
    if (!isDefined(searchValue)) {
      setSearchValue(value);
    }
  }, [searchValue]);

  useEffect(() => {
    setSearchValue(value);
    if (storageKey !== undefined) {
      StorageService.saveValue(storageKey, value);
    }
  }, [value]);

  return [value, setSafeValue];
}

export default useAdvancedState;
