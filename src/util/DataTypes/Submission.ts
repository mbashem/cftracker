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
  NOT_FOUND = "NOT_FOUND",
}

export default class Submission {
  id: number;
  contestId?: number;
  creationTimeSeconds: number;
  relativeTimeSeconds: number;
  problem: Problem;
  author: Party;
  programmingLanguage: string;
  verdict: Verdict;
  testset?: string;
  passedTestCount: number;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
  points?: number;
}
