import { sortByContestId } from "../sortMethods";
import Problem from "./Problem";

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
