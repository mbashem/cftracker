import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { StorageService } from "../util/StorageService";

type GetInitialValue<T> = () => T;

function usePersistentState<T>(
  key: string,
  defaultValue: T,
  getInitialValue?: GetInitialValue<T>,
  useStorage: boolean = true,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (getInitialValue === undefined) {
      return useStorage ? StorageService.getValue(key, defaultValue) : defaultValue;
    }

    const initialValue = getInitialValue();
    if (useStorage) StorageService.saveValue(key, initialValue);
    return initialValue;
  });

  useEffect(() => {
    if (!useStorage) return;
    StorageService.saveValue(key, value);
  }, [key, useStorage, value]);

  return [value, setValue];
}

export default usePersistentState;
