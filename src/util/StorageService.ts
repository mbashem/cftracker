const Keys = {
  JwtToken: "jwtToken",
  StateV2: "statev2",
  Problem: {
    Filter: "PROBLEM_FILTER",
    Tags: "PROBLEM_TAGS",
    SolveStatus: "PROBLEM_SOLVE_STATUS",
  },
  Contest: {
    Filter: "CONTEST_FILTER",
    SolveStatus: "CONTEST_SOLVE_STATUS",
    ParticipantType: "PARTICIPANT_TYPE",
  },
  Codeforces: {
    DebugApiCache: "DEBUG_CODEFORCES_API_CACHE",
  },
  Stats: {
    SubmissionHeatMapYear: "STATS_SUBMISSION_HEATMAP_YEAR",
  },
} as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Set) && !(value instanceof Map);
}

function getJWTToken() {
  return localStorage.getItem(Keys.JwtToken);
}

function setJWTToken(jwtToken: string) {
  localStorage.setItem(Keys.JwtToken, jwtToken);
}

function removeJWTToken() {
  localStorage.removeItem(Keys.JwtToken);
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
    if (storedValue === null) return defaultValue;

    const parsedValue: unknown = JSON.parse(storedValue);
    if (isPlainObject(defaultValue) && isPlainObject(parsedValue)) return { ...defaultValue, ...parsedValue } as T;
    return parsedValue as T;
  } catch (error) {
    console.log(error);
  }
  return defaultValue;
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
} as const;
