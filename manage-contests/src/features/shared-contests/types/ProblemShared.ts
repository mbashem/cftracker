export interface ProblemType {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
}

export class ProblemShared implements ProblemType {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  shared: ProblemType[];

  constructor(
    contestId: number,
    index: string,
    name: string,
    shared?: ProblemType[],
    rating?: number
  ) {
    this.contestId = contestId;
    this.index = index;
    this.name = name;
    this.rating = rating;
    if (shared) this.shared = [...shared];
    else this.shared = new Array<ProblemType>();
  }

  toJSON() {
    let curr = {
      contestId: this.contestId,
      id: this.contestId.toString() + this.index,
      index: this.index,
      shared: [] as any[],
    };

    for (let problem of this.shared)
      curr.shared.push({
        contestId: problem.contestId,
        index: problem.index,
        id: problem.contestId.toString() + problem.index,
      });

    return curr;
  }
}
