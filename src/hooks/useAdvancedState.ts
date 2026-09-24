import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import useSearchParamState, { type SearchKey } from "./useSearchParamState";
import { StorageService } from "../util/StorageService";
import { mergeValue, serializeValue } from "../util/util";
import { validateValue, type Validators } from "../util/validators";

export type { SearchKey, SearchRecord } from "./useSearchParamState";

/**
 * Initializes with the default, then resolves configured sources in order:
 * storage first and URL search second, so search has higher priority when both
 * sources change. Each source is read once initially and again when its key changes.
 * After resolution, every validated state change is synchronized to the currently
 * configured storage and search keys. Omitting a key disables that source.
 */
function useAdvancedState<T>(
  defaultValue: T,
  storageKey?: string,
  searchKey?: SearchKey<T>,
  validator?: Validators<T>,
): [T, Dispatch<SetStateAction<T>>] {
  const [searchValue, setSearchValue] = useSearchParamState<T>(searchKey);
  const [value, setValue] = useState(defaultValue);
  const lastStorageKey = useRef<string | undefined>(undefined);
  const lastSearchKey = useRef<string | undefined>(undefined);

  const setSafeValue = useCallback((nextValue: unknown) => {
    setValue((previousValue) => {
      const candidateValue = typeof nextValue === "function"
        ? (nextValue as (previousValue: T) => T)(previousValue)
        : nextValue;
      return validateValue(candidateValue, previousValue, validator);
    });
  }, [validator]);

  useEffect(() => {
    let updateValue = false;
    let resolvedValue: T = value;
    if (lastStorageKey.current !== storageKey) {
      lastStorageKey.current = storageKey;
      if (storageKey !== undefined) {
        updateValue = true;
        resolvedValue = StorageService.getValue(storageKey, value);
      }
    }

    const searchKeySerialised = serializeValue(searchKey);
    if (lastSearchKey.current !== searchKeySerialised) {
      lastSearchKey.current = searchKeySerialised;
      if (searchKeySerialised !== undefined && searchValue !== undefined) {
        updateValue = true;
        resolvedValue = mergeValue(resolvedValue, searchValue);
      }
    }

    if (updateValue) setSafeValue(resolvedValue);
  }, [storageKey, searchKey]);

  useEffect(() => {
    setSearchValue(value);
    if (storageKey !== undefined) {
      StorageService.saveValue(storageKey, value);
    }
  }, [value]);

  return [value, setSafeValue];
}

export default useAdvancedState;
