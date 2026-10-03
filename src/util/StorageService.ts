const Keys = {
  JwtToken: "jwtToken",
  StateV2: "statev2",
  Problem: {
    Filter: "PROBLEM_FILTER",
    Page: "PROBLEM_PAGE",
    Tags: "PROBLEM_TAGS",
    SolveStatus: "PROBLEM_SOLVE_STATUS",
    FilterV2: "PROBLEM_FILTER_V2",
  },
  Contest: {
    Filter: "CONTEST_FILTER",
    Page: "CONTEST_PAGE",
    SolveStatus: "CONTEST_SOLVE_STATUS",
    ParticipantType: "PARTICIPANT_TYPE",
  },
  Codeforces: {
    DebugApiCache: "DEBUG_CODEFORCES_API_CACHE",
  },
  Stats: {
    SubmissionHeatMapYear: "STATS_SUBMISSION_HEATMAP_YEAR",
  },
  Home: {
    SnapshotPeriod: "HOME_SNAPSHOT_PERIOD",
    SnapshotCustomRange: "HOME_SNAPSHOT_CUSTOM_RANGE",
  },
} as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Set) && !(value instanceof Map);
}

function getJWTToken() {
  try {
    return localStorage.getItem(Keys.JwtToken);
  } catch (error) {
    console.log(error);
    return null;
  }
}

function setJWTToken(jwtToken: string) {
  try {
    localStorage.setItem(Keys.JwtToken, jwtToken);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

function removeJWTToken() {
  try {
    localStorage.removeItem(Keys.JwtToken);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

function saveSet<T>(storageKey: string, valueSet: Set<T>): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...valueSet]));
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

function getSet<T>(storageKey: string, defaultValue: Iterable<T>): Set<T> {
  try {
    const storedValue = localStorage.getItem(storageKey);
    if (storedValue === null) return new Set(defaultValue);

    const parsedValue: unknown = JSON.parse(storedValue);
    if (Array.isArray(parsedValue)) return new Set<T>(parsedValue);
  } catch (error) {
    console.log(error);
  }
  return new Set(defaultValue);
}

function saveMap<MapKey, MapValue>(storageKey: string, valueMap: Map<MapKey, MapValue>): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...valueMap]));
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

function getMap<MapKey, MapValue>(
  storageKey: string,
  defaultValue: Iterable<[MapKey, MapValue]>
): Map<MapKey, MapValue> {
  try {
    const storedValue = localStorage.getItem(storageKey);
    if (storedValue === null) return new Map(defaultValue);

    const parsedValue: unknown = JSON.parse(storedValue);
    if (Array.isArray(parsedValue)) return new Map<MapKey, MapValue>(parsedValue);
  } catch (error) {
    console.log(error);
  }
  return new Map(defaultValue);
}

function saveObject<T>(storageKey: string, value: T): boolean {
  try {
    const serializedObject = JSON.stringify(value);
    if (serializedObject === undefined) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, serializedObject);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

function getObject<T>(storageKey: string, defaultValue: T): T {
  try {
    const storedValue = localStorage.getItem(storageKey);
    if (storedValue === null) {
      const migratedValue = migrateIfNeeded(storageKey, defaultValue);
      if (migratedValue === null) return defaultValue;
      return migratedValue;
    }

    const parsedValue: unknown = JSON.parse(storedValue);
    if (isPlainObject(defaultValue) && isPlainObject(parsedValue)) return { ...defaultValue, ...parsedValue } as T;
    return parsedValue as T;
  } catch (error) {
    console.log(error);
  }
  return defaultValue;
}

function migrateIfNeeded<T>(storageKey: string, defaultValue: T): T | null {
  if (storageKey === Keys.Problem.FilterV2) {
    const migrated = migrateProblemFilter();
    if (migrated !== undefined) return { ...defaultValue, ...migrated } as T;
  }
  return null;
}

function migrateProblemFilter(): Record<string, unknown> | undefined {
  const filter = getObject<unknown>(Keys.Problem.Filter, undefined);
  const migrated = isPlainObject(filter) ? { ...filter } : {};
  const selected = getObject<unknown>(Keys.Problem.Page, undefined);
  const tags = getObject<unknown>(Keys.Problem.Tags, undefined);
  const solveStatus = getObject<unknown>(Keys.Problem.SolveStatus, undefined);
  if (selected !== undefined) migrated.selected = selected;
  if (tags !== undefined) migrated.tags = tags;
  if (solveStatus !== undefined) migrated.solveStatus = solveStatus;
  if (Object.keys(migrated).length === 0) return undefined;

  if (saveObject(Keys.Problem.FilterV2, migrated)) {
    try {
      localStorage.removeItem(Keys.Problem.Filter);
      localStorage.removeItem(Keys.Problem.Page);
      localStorage.removeItem(Keys.Problem.Tags);
      localStorage.removeItem(Keys.Problem.SolveStatus);
    } catch (error) {
      console.log(error);
    }
  }
  return migrated;
}

function getValue<T>(storageKey: string, defaultValue: T): T {
  if (defaultValue instanceof Set) {
    return getSet(storageKey, defaultValue as Iterable<unknown>) as T;
  }
  if (defaultValue instanceof Map) {
    return getMap(storageKey, defaultValue as Iterable<[unknown, unknown]>) as T;
  }
  return getObject(storageKey, defaultValue);
}

function saveValue<T>(storageKey: string, value: T): boolean {
  if (value instanceof Set) return saveSet(storageKey, value);
  if (value instanceof Map) return saveMap(storageKey, value);
  return saveObject(storageKey, value);
}

export const StorageService = {
  Keys,
  getJWTToken,
  setJWTToken,
  removeJWTToken,
  saveSet,
  getSet,
  saveMap,
  getMap,
  saveObject,
  getObject,
  saveValue,
  getValue,
} as const;
