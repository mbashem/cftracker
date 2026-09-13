import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from "react";
import useSearchParamState, { type SearchKey } from "./useSearchParamState";
import { StorageService } from "../util/StorageService";
import { validateValue, type Validators } from "../util/validators";

export type { SearchKey, SearchRecord } from "./useSearchParamState";

function useAdvancedState<T>(
  defaultValue: T,
  storageKey?: string,
  searchKey?: SearchKey<T>,
  validator?: Validators<T>,
): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue] = useState(() => storageKey === undefined
    ? defaultValue
    : validateValue(StorageService.getValue(storageKey, defaultValue), defaultValue, validator));
  const [searchValue, setSearchValue] = useSearchParamState<T>(searchKey);
  const [value, setValue] = useState(() => searchValue === undefined
    ? storedValue
    : validateValue(searchValue, storedValue, validator));
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
    setSafeValue(searchValue);
  }, [searchValue]);

  useEffect(() => {
    if (storageKey !== undefined) StorageService.saveValue(storageKey, value);
    setSearchValue(value);
  }, [value]);

  return [value, setSafeValue];
}

export default useAdvancedState;
