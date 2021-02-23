export const sortByRating = (a, b) => {
  if (a.rating < b.rating) return -1;
  if (a.rating > b.rating) return 1;
  return 0;
};

export const sortBySolveCount = (a, b) => {
  if (a.solvedCount < b.solvedCount) return -1;
  if (a.solvedCount > b.solvedCount) return 1;
  return 0;
};

export const sortByContestId = (a, b) => {
  if (a.contestId < b.contestId) return -1;
  if (a.contestId > b.contestId) return 1;

  if (a.index < b.index) return -1;
  return 1;
};
