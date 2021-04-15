import Comparator from "./Comparator";
import Problem, { ProblemLite } from "./DataTypes/Problem";

export const sortByRating = (a: Problem, b: Problem): number => {
  if (a.rating < b.rating) return -1;
  if (a.rating > b.rating) return 1;
  return 0;
};

export const sortBySolveCount = (a: Problem, b: Problem): number => {
  if (a.solvedCount < b.solvedCount) return -1;
  if (a.solvedCount > b.solvedCount) return 1;
  return 0;
};

export const sortByContestId = (
  a: Problem | ProblemLite,
  b: Problem | ProblemLite
): number => {
  if (a.contestId < b.contestId) return -1;
  if (a.contestId > b.contestId) return 1;

  if (a.index < b.index) return -1;
  return 1;
};

export const sortById = (
  a: Problem | ProblemLite,
  b: Problem | ProblemLite
): number => {
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;

  return 1;
};

export const sortByCompare = <T extends Comparator<T>>(a: T, b: T): number => {
  return a.compareTo(b);
};