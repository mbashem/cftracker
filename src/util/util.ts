/** Returns the Codeforces contest page URL for a contest id. */
export const getContestUrl = (contestId: number) => {
  return "https://codeforces.com/contest/" + contestId;
};

/** Returns the Codeforces problem page URL for a contest id and problem index. */
export const getProblemUrl = (contestId: number, index: string) => {
  return getContestUrl(contestId) + "/problem/" + index;
};

/** Returns the Codeforces user submissions API URL, optionally limited by count. */
export const getUserSubmissionsURL = (handle: string, limit?: number) => {
  return (
    "https://codeforces.com/api/user.status?handle=" +
    handle +
    (limit ? "&&from=1&count=" + limit : "")
  );
};

/** Returns the Codeforces user info API URL for one or more comma-separated handles. */
export const getUserInfoURL = (handle: string) => {
  handle = handle.trim().replace(/,/g, ";");
  return "https://codeforces.com/api/user.info?handles=" + handle;
};

/** Splits a trimmed string by the provided separator. */
export const stringToArray = (s: string, separator: string): string[] => {
  return s.trim().split(separator);
};

/** Returns the character shifted by the given character-code offset. */
export const increment = (char: string, by: number) => {
  return String.fromCharCode(char.charCodeAt(0) + by);
};

/** Returns a random integer in the half-open range [min, max). */
export const getRandomInteger = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min)) + min;
};

/** Parses a query string into a key-value object. */
export const parseQuery = (queryString: string) => {
  queryString = queryString.trim();
  var query: Record<string, string> = {};
  var pairs = (
    queryString[0] === "?" ? queryString.substr(1) : queryString
  ).split("&");
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split("=");
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
  }
  return query;
};

/** Restricts a number to the inclusive min/max bounds, using min for NaN. */
export const clampNumber = (
  num: number,
  min: number,
  max: number
): number => {
  if (isNaN(num)) return min;
  if (num < min) return min;
  if (num > max) return max;
  return num;
};

/**
 * 
 * @param {number} value - The number.
 * @param {Intl.NumberFormatOptions} options - The options.
 *  Default Value: { maximumFractionDigits: 2, minimumFractionDigits: 0 }
 * @returns {string} Returns the number in as formatted string.
 * 
 * @example
 * const result = getFormattedString(3.012)
 * console.log(result); // 3.01
 */
export function getFormattedString(value: number, options: Intl.NumberFormatOptions = { maximumFractionDigits: 2, minimumFractionDigits: 0 }) {
  return value.toLocaleString("en-US", options);
}

/** Checks whether the value is a number primitive. */
export function isNumber<T>(value: T | number): value is number {
  return (typeof value === 'number');
};

/** Checks whether the value is a number and not NaN. */
export function isNonNANNumber<T>(value: T | number): value is number {
  return isNumber(value) && isDefined(value);
}

/** Checks whether a string can be converted to a number. */
export function isStringNumber(value: string): boolean {
  return !isNaN(Number(value));
}

/** Checks whether a value is neither null nor undefined, and not NaN for numbers. */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null && (typeof value !== 'number' || !isNaN(value));
};

/** Checks whether the value is callable. */
export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

/** Returns a shallow object copy with override values applied. */
export function overrideObject<T extends object>(object: T, override: Partial<T>): T {
  return { ...object, ...override };
}
