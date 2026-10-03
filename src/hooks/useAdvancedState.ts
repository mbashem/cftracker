import { type Dispatch, type SetStateAction, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
 * configured search keys. Storage writes wait 300ms and only persist a candidate
 * that still matches the latest committed storage key and value.
 * Omitting a key disables that source.
 */
function useAdvancedState<T>(
  defaultValue: T,
  validator: Validators<T>,
  storageKey?: string,
  searchKey?: SearchKey<T>,
): [T, Dispatch<SetStateAction<T>>] {
  function getResolvedValue(resolvedValue: T) {
    if (isNotEqual(lastStorageKey.current, storageKey)) {
      lastStorageKey.current = storageKey;
      if (isDefined(storageKey)) {
        resolvedValue = validateValue(StorageService.getValue(storageKey, resolvedValue), resolvedValue, validator);
      }
    }

    if (isDefined(searchKey) && isDefined(searchValue) && isNotEqual(lastSearchValue.current, searchValue)) {
      lastSearchValue.current = searchValue;
      let validatedSearchValue = validateValue(searchValue, resolvedValue, validator);
      const searchOverrides = isPlainObject(validatedSearchValue)
        ? removeUndefinedFields(validatedSearchValue)
        : validatedSearchValue;
      resolvedValue = mergeValue(resolvedValue, searchOverrides);
    }

    return resolvedValue;
  }
  const lastStorageKey = useRef<string | undefined>(undefined);
  const lastSearchValue = useRef<T | undefined>(undefined);
  const [searchValue, setSearchValue] = useSearchParamState(searchKey, validator);
  const [value, setValue] = useState(() => {
    return getResolvedValue(defaultValue);
  });
  const latestStorageValue = useRef({ storageKey, value });

  useLayoutEffect(() => {
    latestStorageValue.current = { storageKey, value };
  }, [storageKey, value]);

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
    setSafeValue(getResolvedValue(value));
  }, [storageKey, searchKey, searchValue]);

  useEffect(() => {
    if (!isDefined(searchValue)) {
      setSearchValue(value);
    }
  }, [searchValue]);

  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  useEffect(() => {
    if (storageKey === undefined) return;

    const timeout = setTimeout(() => {
      const latest = latestStorageValue.current;
      if (latest.storageKey === storageKey && isEqual(latest.value, value)) {
        StorageService.saveValue(storageKey, value);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [storageKey, value]);

  return [value, setSafeValue];
}

export default useAdvancedState;
