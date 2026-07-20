import Comparator, { Compared } from "../../util/Comparator";
import Party from "./Party";
import Problem, { ProblemData } from "./Problem";

export enum Verdict {
  FAILED = "FAILED",
  OK = "OK",
  PARTIAL = "PARTIAL",
  COMPILATION_ERROR = "COMPILATION_ERROR",
  RUNTIME_ERROR = "RUNTIME_ERROR",
  WRONG_ANSWER = "WRONG_ANSWER",
  PRESENTATION_ERROR = "PRESENTATION_ERROR",
  TIME_LIMIT_EXCEEDED = "TIME_LIMIT_EXCEEDED",
  MEMORY_LIMIT_EXCEEDED = "MEMORY_LIMIT_EXCEEDED",
  IDLENESS_LIMIT_EXCEEDED = "IDLENESS_LIMIT_EXCEEDED",
  SECURITY_VIOLATED = "SECURITY_VIOLATED",
  CRASHED = "CRASHED",
  INPUT_PREPARATION_CRASHED = "INPUT_PREPARATION_CRASHED",
  CHALLENGED = "CHALLENGED",
  SKIPPED = "SKIPPED",
  TESTING = "TESTING",
  REJECTED = "REJECTED",
  // Custom Verdict
  SOLVED = "SOLVED",
  ATTEMPTED = "ATTEMPTED",
  UNSOLVED = "UNSOLVED",
}

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

export function compareSubmissionData(a: SubmissionLiteData, b: SubmissionLiteData): number {
  if (a.contestId === b.contestId) {
    if (a.index === b.index) {
      if (a.verdict === b.verdict) return Compared.EQUAL;
      if (a.verdict === Verdict.OK) return Compared.LESS;
      if (b.verdict === Verdict.OK) return Compared.GREATER;
      if (a.verdict < b.verdict) return Compared.LESS;
      return Compared.GREATER;
    }

    if (a.index > b.index) return Compared.GREATER;
    return Compared.LESS;
  }

  if (a.contestId < b.contestId) return Compared.LESS;
  return Compared.GREATER;
}

export class SubmissionLite implements Comparator<SubmissionLite> {
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

  compareTo = (a: SubmissionLite): number => compareSubmissionData(this, a);
}

export default class Submission extends SubmissionLite {
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
