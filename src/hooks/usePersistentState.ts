import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { StorageService } from "../util/StorageService";

function getPersistentValue<T>(key: string, defaultValue: T): T {
  if (defaultValue instanceof Set) {
    return StorageService.getSet(key, defaultValue as Iterable<unknown>) as T;
  }

  if (defaultValue instanceof Map) {
    return StorageService.getMap(key, defaultValue as Iterable<[unknown, unknown]>) as T;
  }

  return StorageService.getObject(key, defaultValue);
}

function savePersistentValue<T>(key: string, value: T) {
  if (value instanceof Set) {
    StorageService.saveSet(key, value as Set<unknown>);
    return;
  }

  if (value instanceof Map) {
    StorageService.saveMap(key, value as Map<unknown, unknown>);
    return;
  }

  StorageService.saveObject(key, value);
}

function usePersistentState<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => getPersistentValue(key, defaultValue));

  useEffect(() => {
    savePersistentValue(key, value);
  }, [key, value]);

  return [value, setValue];
}

export default usePersistentState;
