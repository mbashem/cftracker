export namespace StorageService {
  export namespace Keys {
    export const JwtToken = "jwtToken";
    export const StateV2 = "statev2";

    export namespace Problem {
      export const Filter = "PROBLEM_FILTER";
      export const Tags = "PROBLEM_TAGS";
      export const SolveStatus = "PROBLEM_SOLVE_STATUS";
    }

    export namespace Contest {
      export const Filter = "CONTEST_FILTER";
      export const SolveStatus = "CONTEST_SOLVE_STATUS";
      export const ParticipantType = "PARTICIPANT_TYPE";
    }

    export namespace Codeforces {
      export const DebugApiCache = "DEBUG_CODEFORCES_API_CACHE";
    }

    export namespace Stats {
      export const SubmissionHeatMapYear = "STATS_SUBMISSION_HEATMAP_YEAR";
    }
  }

  function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Set) && !(value instanceof Map);
  }

  export function getJWTToken() {
    return localStorage.getItem(Keys.JwtToken);
  }

  export function setJWTToken(jwtToken: string) {
    localStorage.setItem(Keys.JwtToken, jwtToken);
  }

  export function removeJWTToken() {
    localStorage.removeItem(Keys.JwtToken);
  }

  export const saveSet = <T>(storageKey: string, valueSet: Set<T>): boolean => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...valueSet]));
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  };

  export const getSet = <T>(storageKey: string, defaultValue: Iterable<T>): Set<T> => {
    try {
      const storedValue = localStorage.getItem(storageKey);
      if (storedValue === null) return new Set(defaultValue);

      let parsedValue = JSON.parse(storedValue);

      if (parsedValue) {
        let valueSet = new Set<T>(parsedValue);
        return valueSet;
      }
    } catch (error) {
      console.log(error);
    }
    return new Set(defaultValue);
  };

  export const saveMap = <MapKey, MapValue>(storageKey: string, valueMap: Map<MapKey, MapValue>): boolean => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...valueMap]));
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  };

  export const getMap = <MapKey, MapValue>(
    storageKey: string,
    defaultValue: Iterable<[MapKey, MapValue]>
  ): Map<MapKey, MapValue> => {
    try {
      const storedValue = localStorage.getItem(storageKey);
      if (storedValue === null) return new Map(defaultValue);

      let parsedValue = JSON.parse(storedValue);

      if (parsedValue) {
        return new Map<MapKey, MapValue>(parsedValue);
      }
    } catch (error) {
      console.log(error);
    }
    return new Map(defaultValue);
  };

  export const saveObject = <T>(storageKey: string, value: T): boolean => {
    try {
      const serializedObject = JSON.stringify(value);
      if (serializedObject === undefined) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, serializedObject);
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  };

  export const getObject = <T>(storageKey: string, defaultValue: T): T => {
    try {
      const storedValue = localStorage.getItem(storageKey);
      if (storedValue === null) return defaultValue;

      let parsedValue = JSON.parse(storedValue);

      if (isPlainObject(defaultValue) && isPlainObject(parsedValue)) return { ...defaultValue, ...parsedValue } as T;
      return parsedValue as T;
    } catch (error) {
      console.log(error);
    }
    return defaultValue;
  };

}
