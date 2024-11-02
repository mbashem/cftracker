import Comparator, { Compared } from "../../util/Comparator";
import Party from "./Party";
import Problem from "./Problem";

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

export class SubmissionLite implements Comparator<SubmissionLite> {
  contestId: number;
  index: string;
  verdict: Verdict;

  constructor(contestId: number, index: string, verdict: Verdict) {
    this.contestId = contestId;
    this.index = index;
    this.verdict = verdict;
  }

  compareTo = (a: SubmissionLite): number => {
    if (this.contestId === a.contestId) {
      if (this.index === a.index) {
        if (this.verdict === a.verdict) return Compared.EQUAL;
        if (this.verdict === Verdict.OK) return Compared.LESS;
        else if (a.verdict === Verdict.OK) return Compared.GREATER;
        else if (this.verdict < a.verdict) return Compared.LESS;
        else return Compared.GREATER;
      } else if (this.index > a.index) return Compared.GREATER;
      else return Compared.LESS;
    }

    if (this.contestId < a.contestId) return Compared.LESS;
    return Compared.GREATER;
  };
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

  constructor(sub: Submission) {
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
    this.author = sub.author;
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
