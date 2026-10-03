import Contest from "../../src/types/CF/Contest";
import Problem from "../../src/types/CF/Problem";
import Submission, { Verdict } from "../../src/types/CF/Submission";
import { ParticipantType } from "../../src/types/CF/Party";
import { frontend } from "./frontendMocks";

export function seedProblemFixtures() {
  frontend.problems = [
    new Problem(100, "A", "Alpha Dynamic", "PROGRAMMING", 800, ["dp"], 50),
    new Problem(100, "B", "Beta Graph", "PROGRAMMING", 1200, ["graphs"], 40),
    new Problem(101, "A", "Gamma Mixed", "PROGRAMMING", 1600, ["dp", "graphs"], 30),
    new Problem(102, "A", "Delta Unrated", "PROGRAMMING", undefined, [], 20),
    new Problem(15000, "A", "Epsilon High ID", "PROGRAMMING", 2000, ["math"], 10),
  ];
  frontend.contests = [100, 101, 102, 15000].map((id, index) => {
    const start = new Date(2026, 0, index + 1, 12).getTime() / 1000;
    const contest = new Contest(id, `Round ${id} (Div. 2)`, "CF", "FINISHED", 7200, start);
    contest.count = id === 100 ? 2 : 1;
    return contest;
  });
  frontend.submissions = [
    createSubmission(1, frontend.problems[0], Verdict.WRONG_ANSWER, 100),
    createSubmission(2, frontend.problems[0], Verdict.OK, 200),
    createSubmission(3, frontend.problems[1], Verdict.WRONG_ANSWER, 300),
  ];
}

export function createSubmission(id: number, problem: Problem, verdict: Verdict, creationTimeSeconds: number) {
  return new Submission({
    id, contestId: problem.contestId, index: problem.index, verdict, creationTimeSeconds,
    relativeTimeSeconds: 0, problem,
    author: { members: [{ handle: "tourist" }], participantType: ParticipantType.PRACTICE, ghost: false },
    programmingLanguage: "GNU C++", passedTestCount: 0, timeConsumedMillis: 0, memoryConsumedBytes: 0,
  });
}
