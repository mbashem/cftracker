import Comparator, { Compared } from "../Comparator";

export class ProblemStatistics {
  contestId?: number;
  index: string;
  solvedCount: number;

  constructor(contestId: number, index: string, solvedCount: number) {
    this.contestId = contestId;
    this.index = index;
    this.solvedCount = solvedCount;
  }
}

export class ProblemLite implements Comparator<ProblemLite> {
  id: string;
  contestId: number;
  index: string;

  constructor(contestId: number, index: string) {
    this.contestId = contestId;
    this.index = index;
    this.id = this.contestId.toString() + index;
  }

  compareTo = (a: ProblemLite): number => {
    if (this.contestId < a.contestId) return Compared.LESS;
    if (this.contestId > a.contestId) return Compared.GREATER;

    if (this.index < a.index) return Compared.LESS;
    if (this.index > a.index) return Compared.GREATER;
    return Compared.EQUAL;
  };
}

export default class Problem {
  id?: string;
  contestId?: number;
  problemsetName?: string;
  index: string;
  name: string;
  type: string;
  points?: number;
  rating?: number;
  tags: string[];
  solvedCount?: number;

  constructor(
    contestId: number,
    index: string,
    name: string,
    type: string,
    rating: number = -1
  ) {
    this.contestId = contestId;
    this.index = index;
    this.name = name;
    this.type = type;
    this.rating = rating;
    this.id = contestId.toString() + index;
  }

  public clone = (): Problem => {
    const clonedProblem = new Problem(
      this.contestId,
      this.index,
      this.name,
      this.type,
      this.rating
    );
    clonedProblem.tags = [...this.tags];

    return clonedProblem;
  };
}
