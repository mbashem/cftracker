import axios from "axios";
import { CFAPIContest, CFAPIResult } from "./CFApiTypes";
import { createOrUpdateContest } from "../contests/services/ContestService";

export async function getContestWithProblemByIdFromCF(contestID: number) {
  const res = await axios.get(
    `https://codeforces.com/api/contest.standings?lang=en&contestId=${contestID}&from=1&count=1&showUnofficial=false`
  );

  return res.data.result as CFAPIResult;
}

export async function getAllContestsFromCF(gym = false) {
  const res = await axios.get(
    `https://codeforces.com/api/contest.list?lang=en&gym=${gym ? "true" : "false"
    }`
  );

  return res.data.result as CFAPIContest[];
}