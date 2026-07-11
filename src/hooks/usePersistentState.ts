import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { StorageService } from "../util/StorageService";

enum PersistentValueType {
  Object,
  Set,
  Map,
}

function getPersistentValueType(value: unknown): PersistentValueType {
  if (value instanceof Set) return PersistentValueType.Set;
  if (value instanceof Map) return PersistentValueType.Map;
  return PersistentValueType.Object;
}

function getPersistentValue<T>(key: string, defaultValue: T, type: PersistentValueType): T {
  if (type === PersistentValueType.Set) {
    return StorageService.getSet(key, defaultValue as Iterable<unknown>) as T;
  }

  if (type === PersistentValueType.Map) {
    return StorageService.getMap(key, defaultValue as Iterable<[unknown, unknown]>) as T;
  }

  return StorageService.getObject(key, defaultValue);
}

function savePersistentValue<T>(key: string, value: T, type: PersistentValueType) {
  if (type === PersistentValueType.Set) {
    StorageService.saveSet(key, value as Set<unknown>);
    return;
  }

  if (type === PersistentValueType.Map) {
    StorageService.saveMap(key, value as Map<unknown, unknown>);
    return;
  }

  StorageService.saveObject(key, value);
}

function usePersistentState<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [valueType] = useState(() => getPersistentValueType(defaultValue));
  const [value, setValue] = useState<T>(() => getPersistentValue(key, defaultValue, valueType));

  useEffect(() => {
    savePersistentValue(key, value, valueType);
  }, [key, value, valueType]);

  return [value, setValue];
}

export default usePersistentState;
