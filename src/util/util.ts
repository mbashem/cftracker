export const formateDate = (time: number) => {
  const date = new Date(time * 1000);
  //console.log(date);
  return (
    date.getDate() +
    "/" +
    (date.getMonth() + 1) +
    "/" +
    date.getFullYear() +
    " " +
    date.getHours() +
    ":" +
    date.getMinutes()
  );
};

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

export const charInc = (c: string, number: number) => {
  return String.fromCharCode(c.charCodeAt(0) + number);
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

export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

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

export const isNumber = (value: string | number): boolean => {
  return value != null && value !== "" && !isNaN(Number(value.toString()));
};

export const isDefined = (value: any): boolean => {
  return value !== undefined && value !== null && (typeof value !== 'number' || !isNaN(value));
};