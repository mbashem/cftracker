import 'server-only'

import axios from "axios";
import { CFAPIContest, CFAPIResult } from "./CFApiTypes";
import crypto from "crypto";

type Params = Record<string, string | number | boolean>;
const requestConfig = {
  timeout: 30_000,
  maxContentLength: 25 * 1024 * 1024,
};

function getRequiredEnvironmentVariable(name: "CF_API_KEY" | "CF_API_SECRET"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for authenticated Codeforces API calls`);
  return value;
}

function generateAuthenticatedApiUrl(
  methodName: string,
  apiKey: string,
  apiSecret: string,
  params: Params = {}
): string {
  const baseUrl = "https://codeforces.com/api";

  // 1. Add required params
  const time = Math.floor(Date.now() / 1000);

  const allParams: Params = {
    ...params,
    apiKey,
    time,
  };

  // 2. Sort params lexicographically (by key, then value)
  const sortedParams = Object.entries(allParams).sort(([k1, v1], [k2, v2]) => {
    if (k1 === k2) {
      return String(v1).localeCompare(String(v2));
    }
    return k1.localeCompare(k2);
  });

  // 3. Build query string
  const queryString = sortedParams
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  // 4. Generate random 6-char string
  const rand = crypto.randomBytes(3).toString("hex");

  // 5. Create string to hash
  const stringToHash = `${rand}/${methodName}?${queryString}#${apiSecret}`;

  // 6. SHA-512 hash
  const hash = crypto
    .createHash("sha512")
    .update(stringToHash)
    .digest("hex");

  // 7. Final apiSig
  const apiSig = `${rand}${hash}`;

  // 8. Final URL
  return `${baseUrl}/${methodName}?${queryString}&apiSig=${apiSig}`;
}

export async function getAuthenticatedContestWithProblemByIdFromCF(contestID: number) {
  const url = generateAuthenticatedApiUrl(
    "contest.standings",
    getRequiredEnvironmentVariable("CF_API_KEY"),
    getRequiredEnvironmentVariable("CF_API_SECRET"),
    { contestId: contestID, from: 1, count: 1, showUnofficial: false }
  );

  const res = await axios.get(url, requestConfig);

  return res.data.result as CFAPIResult;
}

export async function getContestWithProblemByIdFromCF(contestID: number) {
  const url = `https://codeforces.com/api/contest.standings?contestId=${contestID}`;
  const res = await axios.get(url, requestConfig);

  return res.data.result as CFAPIResult;
}

export async function getAllContestsFromCF(gym = false) {
  const res = await axios.get(
    `https://codeforces.com/api/contest.list?lang=en&gym=${gym ? "true" : "false"
    }`,
    requestConfig
  );

  return res.data.result as CFAPIContest[];
}
