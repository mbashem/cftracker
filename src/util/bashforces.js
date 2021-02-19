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

export const createProblemUrl = (contestId, index) => {
  return "https://codeforces.com/contest/" + contestId + "/problem/" + index;
};

export const charInc = (c, number) => {
  return String.fromCharCode(c.charCodeAt() + number);
};
