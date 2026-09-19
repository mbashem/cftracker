import type Comparator from "../../util/Comparator";
import { Compared } from "../../util/Comparator";
import type Party from "./Party";
import Problem, { type ProblemData } from "./Problem";
import { Verdict } from "./Verdict";

export { Verdict } from "./Verdict";

export enum SimpleVerdict {
  SOLVED = "SOLVED",
  ATTEMPTED = "ATTEMPTED",
  UNSOLVED = "UNSOLVED",
}

export interface SubmissionLiteData {
  contestId: number;
  index: string;
  verdict: Verdict;
}

export interface SubmissionData extends SubmissionLiteData {
  id: number;
  creationTimeSeconds: number;
  relativeTimeSeconds: number;
  problem: ProblemData;
  author: Party;
  programmingLanguage: string;
  testset?: string;
  passedTestCount: number;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
  points?: number;
  fromShared?: boolean;
}

export function getSimpleVerdict(verdict?: Verdict) {
  switch (verdict) {
    case undefined:
      return SimpleVerdict.UNSOLVED;
    case Verdict.OK:
      return SimpleVerdict.SOLVED;
    default:
      return SimpleVerdict.ATTEMPTED;
  }
}

export function compareSubmissionTime(
  first: Pick<SubmissionData, "creationTimeSeconds">,
  second: Pick<SubmissionData, "creationTimeSeconds">,
): number {
  if (first.creationTimeSeconds < second.creationTimeSeconds) return Compared.LESS;
  if (first.creationTimeSeconds > second.creationTimeSeconds) return Compared.GREATER;
  return Compared.EQUAL;
}

export class SubmissionLite {
  contestId: number;
  index: string;
  verdict: Verdict;

  get simpleVerdict() {
    return getSimpleVerdict(this.verdict);
  }

  constructor(contestId: number, index: string, verdict: Verdict) {
    this.contestId = contestId;
    this.index = index;
    this.verdict = verdict;
  }
}

export default class Submission extends SubmissionLite implements Comparator<Submission> {
  id: number;
  creationTimeSeconds: number;
  relativeTimeSeconds: number;
  problem: Problem;
  author: Party;
  programmingLanguage: string;
  testset?: string;
  passedTestCount: number;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
  points?: number;
  fromShared?: boolean;

  get submissionDate(): Date {
    let secondToMillisecond = 1000;
    return new Date(this.creationTimeSeconds * secondToMillisecond);
  }

  compareTo = (submission: Submission): number => compareSubmissionTime(this, submission);

  constructor(sub: SubmissionData) {
    super(sub.contestId, sub.problem.index, sub.verdict);
    this.id = sub.id;
    this.creationTimeSeconds = sub.creationTimeSeconds;
    this.relativeTimeSeconds = sub.relativeTimeSeconds;
    this.problem = new Problem(
      sub.problem.contestId,
      sub.problem.index, sub.problem.name,
      sub.problem.type,
      sub.problem.rating,
      sub.problem.tags,
      sub.problem.solvedCount
    );
    this.author = {
      ...sub.author,
      members: sub.author.members.map((member) => ({ ...member })),
    };
    this.programmingLanguage = sub.programmingLanguage;
    this.verdict = sub.verdict;
    this.testset = sub.testset;
    this.passedTestCount = sub.passedTestCount;
    this.timeConsumedMillis = sub.timeConsumedMillis;
    this.memoryConsumedBytes = sub.memoryConsumedBytes;
    this.points = sub.points;
    this.fromShared = sub.fromShared ? sub.fromShared : false;
  }
}
