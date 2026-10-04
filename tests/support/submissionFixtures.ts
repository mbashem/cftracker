import Problem from "../../src/types/CF/Problem";
import Submission, { Verdict } from "../../src/types/CF/Submission";
import { ParticipantType } from "../../src/types/CF/Party";

export function createSubmission(id: number, problem: Problem, verdict: Verdict, creationTimeSeconds: number) {
  return new Submission({
    id, contestId: problem.contestId, index: problem.index, verdict, creationTimeSeconds,
    relativeTimeSeconds: 0, problem,
    author: { members: [{ handle: "tourist" }], participantType: ParticipantType.PRACTICE, ghost: false },
    programmingLanguage: "GNU C++", passedTestCount: 0, timeConsumedMillis: 0, memoryConsumedBytes: 0,
  });
}
