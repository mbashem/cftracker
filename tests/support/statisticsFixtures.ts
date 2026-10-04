import { frontend } from "./frontendMocks";
import { createSubmission, seedProblemFixtures } from "./problemFixtures";
import { Verdict } from "../../src/types/CF/Submission";

// F1: 3 accepted and 2 rejected submissions; 2 solved problems, 1 attempted.
export function seedStatisticsFixtures() {
  seedProblemFixtures();
  const [rated, attempted, , unrated] = frontend.problems;
  const firstDay = new Date(2024, 1, 28, 12).getTime() / 1000;
  const secondDay = new Date(2024, 1, 29, 12).getTime() / 1000;
  frontend.submissions = [
    createSubmission(1, rated, Verdict.WRONG_ANSWER, firstDay),
    createSubmission(2, rated, Verdict.OK, firstDay + 60),
    createSubmission(3, rated, Verdict.OK, secondDay),
    createSubmission(4, unrated, Verdict.OK, secondDay + 60),
    createSubmission(5, attempted, Verdict.WRONG_ANSWER, secondDay + 120),
  ];
}
