import 'server-only'

import axios from "axios";
import { CFAPIContest, CFAPIResult } from "./CFApiTypes";
import crypto from "crypto";

type Params = Record<string, string | number | boolean>;

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
  const rand = Math.random().toString(36).substring(2, 8);

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

export async function getContestWithProblemByIdFromCF(contestID: number) {
  console.log("API Key: ", process.env.CF_API_KEY);
  console.log("API Secret: ", process.env.CF_API_SECRET);
  let url = generateAuthenticatedApiUrl(
    "contest.standings",
    process.env.CF_API_KEY || "",
    process.env.CF_API_SECRET || "",
    { contestId: contestID, from: 1, count: 1, showUnofficial: false }
  )

  console.log("URL: ", url);
  const res = await axios.get(url);

  return res.data.result as CFAPIResult;
}

export async function getAllContestsFromCF(gym = false) {
  const res = await axios.get(
    `https://codeforces.com/api/contest.list?lang=en&gym=${gym ? "true" : "false"
    }`
  );

  return res.data.result as CFAPIContest[];
}