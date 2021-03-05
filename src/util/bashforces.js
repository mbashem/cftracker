export const formateDate = (time) => {
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

export const getContestUrl = (contestId) => {
  return "https://codeforces.com/contest/" + contestId;
};

export const getProblemUrl = (contestId, index) => {
  return getContestUrl(contestId) + "/problem/" + index;
};

export const getUserSubmissions = (handle) => {
  return "https://codeforces.com/api/user.status?handle=" + handle;
};

export const getUserInfo = (handle) => {
  handle = handle.trim().replace(/,/g, ";");
  return "https://codeforces.com/api/user.info?handles=" + handle;
};

export const charInc = (c, number) => {
  return String.fromCharCode(c.charCodeAt() + number);
};

export const getRandomInteger = (min, max) => {
  return Math.floor(Math.random() * (max - min)) + min;
};
