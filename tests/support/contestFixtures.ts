import Contest from "../../src/types/CF/Contest";
import Problem from "../../src/types/CF/Problem";
import { ParticipantType } from "../../src/types/CF/Party";
import { Verdict } from "../../src/types/CF/Submission";
import { frontend } from "./frontendMocks";
import { createSubmission, seedProblemFixtures } from "./problemFixtures";

export function seedContestFixtures() {
  seedProblemFixtures();
  // Reuse the problem fixtures but hydrate contest cells through the real model.
  frontend.contests = frontend.contests.map((source) => {
    const contest = new Contest(source.id, `Codeforces Round ${source.id} (Div. 2)`, "CF", "FINISHED", 7200, source.startTimeSeconds);
    frontend.problems.filter((problem) => problem.contestId === contest.id).forEach(contest.addProblem);
    return contest;
  });
  const splitProblems = ["A1", "A2", "A3"].map((index, i) =>
    new Problem(200, index, `Split ${index}`, "PROGRAMMING", 1200 + i * 200, [], 10),
  );
  const divisionThree = new Contest(200, "Codeforces Round 200 (Div. 3)", "CF", "FINISHED", 7200, 1767268800);
  splitProblems.forEach(divisionThree.addProblem);
  const missingMetadata = new Contest(201, "Codeforces Round 201 (Div. 1)", "CF", "FINISHED", 7200, undefined);
  missingMetadata.count = 1;
  missingMetadata.mxInd = 2;
  const empty = new Contest(202, "Codeforces Round 202 (Div. 2)", "CF", "FINISHED", 7200, undefined);
  frontend.contests.push(divisionThree, missingMetadata, empty);
  frontend.problems.push(...splitProblems);

  const contestant = createSubmission(4, frontend.problems[2], Verdict.WRONG_ANSWER, 400);
  contestant.author.participantType = ParticipantType.CONTESTANT;
  const virtual = createSubmission(5, frontend.problems[3], Verdict.OK, 500);
  virtual.author.participantType = ParticipantType.VIRTUAL;
  const shared = createSubmission(2, splitProblems[0], Verdict.OK, 200);
  shared.fromShared = true;
  frontend.submissions.push(contestant, virtual, shared);
}
