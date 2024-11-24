export const getContestUrl = (contestId: number) => {
  return "https://codeforces.com/contest/" + contestId;
};

export const getProblemUrl = (contestId: number, index: string) => {
  return getContestUrl(contestId) + "/problem/" + index;
};

export const getUserSubmissionsURL = (handle: string, limit?: number) => {
  return (
    "https://codeforces.com/api/user.status?handle=" +
    handle +
    (limit ? "&&from=1&count=" + limit : "")
  );
};

export const getUserInfoURL = (handle: string) => {
  handle = handle.trim().replace(/,/g, ";");
  return "https://codeforces.com/api/user.info?handles=" + handle;
};

export const stringToArray = (s: string, separator: string): string[] => {
  return s.trim().split(separator);
};

export const increment = (char: string, by: number) => {
  return String.fromCharCode(char.charCodeAt(0) + by);
};

export const getRandomInteger = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min)) + min;
};

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

export const processNumber = (
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

export function isNumber<T>(value: T | number): value is number {
  return (typeof value === 'number');
};

export function isNonNANNumber<T>(value: T | number): value is number {
  return isNumber(value) && !isDefined(value);
}

export function isStringNumber(value: string): boolean {
  return !isNaN(Number(value));
}

export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null && (typeof value !== 'number' || !isNaN(value));
};

export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}