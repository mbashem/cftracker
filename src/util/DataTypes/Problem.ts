import Comparator, { Compared } from "../Comparator";

export class ProblemLite implements Comparator<ProblemLite> {
  id?: string;
  contestId?: number;
  index: string;

  constructor(contestId: number, index: string) {
    this.contestId = contestId;
    this.index = index;
    this.id = this.contestId.toString() + index;
  }

  getId = (): string => {
    if (this.contestId && !this.id)
      this.id = this.contestId.toString() + this.index;
    if (!this.id) return this.index;
    return this.id;
  };

  compareTo = (a: ProblemLite): number => {
    if (this.contestId < a.contestId) return Compared.LESS;
    if (this.contestId > a.contestId) return Compared.GREATER;

    if (this.index < a.index) return Compared.LESS;
    if (this.index > a.index) return Compared.GREATER;
    return Compared.EQUAL;
  };

  equal = (a: ProblemLite): boolean => {
    return this.compareTo(a) === Compared.EQUAL;
  };
}

export class ProblemStatistics extends ProblemLite {
  solvedCount: number;

  constructor(contestId: number, index: string, solvedCount: number) {
    super(contestId, index);
    this.solvedCount = solvedCount;
  }
}

export class ProblemShared extends ProblemLite {
  shared?: ProblemLite[];

  constructor(contestId?: number, index?: string, shared?: ProblemLite[]) {
    super(contestId, index);
    if (shared) this.shared = [...shared];
    else this.shared = new Array<ProblemLite>();
  }
}

export default class Problem extends ProblemLite {
  problemsetName?: string;
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
    rating: number = -1,
    tags: string[],
    solvedCount?: number
  ) {
    super(contestId, index);
    this.contestId = contestId;
    this.index = index;
    this.name = name;
    this.type = type;
    this.rating = rating;
    this.tags = [...tags];
    if (solvedCount) this.solvedCount = solvedCount;
    else this.solvedCount = 0;
  }

  setTags = (tags: string[]): void => {
    this.tags = [...tags];
  };

  getTags = (): string[] => {
    return [...this.tags];
  };

  public clone = (): Problem => {
    const clonedProblem = new Problem(
      this.contestId,
      this.index,
      this.name,
      this.type,
      this.rating,
      this.tags
    );
    return clonedProblem;
  };
}
