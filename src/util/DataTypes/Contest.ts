import { sortByContestId } from "../sortMethods";
import Problem from "./Problem";

export enum ContestCat {
  DIV1 = "Div. 1",
  DIV2 = "Div. 2",
  DIV3 = "Div. 3",
  EDUCATIONAL = "Educational",
  DIV12 = "Div. 1 + Div. 2",
  GLOBAL = "Global",
  OTHERS = "Others",
  ALL = "All",
}

export default class Contest {
  id: number;
  name: string;
  type?: string;
  phase: string;
  frozen: boolean;
  durationSeconds?: number;
  startTimeSeconds?: number;
  relativeTimeSeconds?: number;
  preparedBy?: string;
  websiteUrl?: string;
  description?: string;
  difficulty?: number;
  kind?: string;
  icpcRegion?: string;
  country?: string;
  city?: string;
  season?: string;
  solveCount: number = 0;
  attempCount: number = 0;
  count: number;
  category?: ContestCat;
  short?: string;

  problemList: Record<string, Problem[]>;

  constructor(
    id: number,
    name: string,
    type: string,
    phase: string,
    durationSeconds: number,
    startTimeSeconds: number
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.phase = phase;
    this.durationSeconds = durationSeconds;
    this.startTimeSeconds = startTimeSeconds;
    this.solveCount = 0;
    this.attempCount = 0;
    this.count = 0;
    this.problemList = {};

    let div2 = -1;
    let div1 = -1;
    let div3 = -1;
    let edu = -1;
    let firstS = -1,
      firstE = -1,
      hashS = -1,
      hashE = -1,
      global = -1;

    for (let i = 0; i < this.name.length; i++) {
      if (i + ContestCat.DIV1.length - 1 < this.name.length) {
        if (this.name.substr(i, ContestCat.DIV1.length) === ContestCat.DIV1) {
          div1 = i;
        } else if (
          this.name.substr(i, ContestCat.DIV1.length) === ContestCat.DIV2
        ) {
          div2 = i;
        } else if (
          this.name.substr(i, ContestCat.DIV1.length) === ContestCat.DIV3
        ) {
          div3 = i;
        }
      }

      if (i + ContestCat.EDUCATIONAL.length - 1 < this.name.length) {
        if (
          this.name.substr(i, ContestCat.EDUCATIONAL.length) ===
          ContestCat.EDUCATIONAL
        )
          edu = i;
      }

      if (i + ContestCat.GLOBAL.length - 1 < this.name.length) {
        if (this.name.substr(i, ContestCat.GLOBAL.length) === ContestCat.GLOBAL)
          global = i;
      }

      if (this.name[i] >= "0" && this.name[i] <= "9") {
        if (firstS === -1) {
          firstS = i;
          firstE = i;
        }

        if (i - 1 >= 0 && hashS === -1 && this.name[i - 1] === "#") {
          hashS = i;
          hashE = i;
        }

        if (firstE === i - 1) firstE = i;

        if (hashE === i - 1) hashE = i;
      }
    }

    if (hashS !== -1) {
      if (div2 !== -1 && div1 !== -1) {
        this.category = ContestCat.DIV12;
      } else if (div1 !== -1) {
        this.category = ContestCat.DIV1;
      } else if (div2 !== -1) {
        this.category = ContestCat.DIV2;
      } else if (div3 !== -1) {
        this.category = ContestCat.DIV3;
      }

      if (this.category)
        this.short =
          this.category + "#" + this.name.substr(hashS, hashE - hashS + 1);
    }

    if (firstS !== -1 && !this.category) {
      if (edu !== -1) {
        this.category = ContestCat.EDUCATIONAL;
      }

      if (global !== -1) {
        this.category = ContestCat.GLOBAL;
      }
      this.short =
        this.category + "#" + this.name.substr(firstS, firstE - firstS + 1);
    }

    if (!this.category) {
      this.category = ContestCat.OTHERS;
      this.short = this.name;
    }
  }

  public clone = (): Contest => {
    const clonedContest = new Contest(
      this.id,
      this.name,
      this.type,
      this.phase,
      this.durationSeconds,
      this.startTimeSeconds
    );

    clonedContest.solveCount = this.solveCount;
    clonedContest.attempCount = this.attempCount;
    clonedContest.count = this.count;

    clonedContest.problemList = { ...this.problemList };

    return clonedContest;
  };

  addProblem = (problem: Problem): boolean => {
    let ind: string = problem.index.charAt(0);
    if (this.problemList[ind] === undefined)
      this.problemList[ind] = new Array<Problem>();
    if (this.problemList[ind].length > 2) return false;

    for (let i = 0; i < this.problemList[ind].length; i++) {
      if (problem.getId() === this.problemList[ind][i].getId()) {
        if (this.problemList[ind][i].solved) this.solveCount--;
        else if (this.problemList[ind][i].attempted) this.attempCount--;
        if (problem.solved) this.solveCount++;
        else if (problem.attempted) this.attempCount++;
        this.problemList[ind][i] = problem;
        return false;
      }
    }

    this.count++;
    if (problem.solved) this.solveCount++;
    else if (problem.attempted) this.attempCount++;
    this.problemList[ind].push(problem);
    this.problemList[ind].sort(sortByContestId);
    return true;
  };
}
