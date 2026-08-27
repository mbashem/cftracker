import 'server-only'

import axios from "axios";
import { CFAPIContest, CFAPIProblem } from "./CFApiTypes";
import crypto from "crypto";
import { err, isError, ok, Result } from "@/utils/result";

type Params = Record<string, string | number | boolean>;
type ContestSummary = Pick<CFAPIContest, "id" | "name">;
type ProblemSummary = Pick<CFAPIProblem, "contestId" | "index" | "name"> & {
  rating?: number;
};
type ContestWithProblems = {
  contest: ContestSummary;
  problems: ProblemSummary[];
};

const requestConfig = {
  timeout: 30_000,
  maxContentLength: 25 * 1024 * 1024,
};

function getRequiredEnvironmentVariable(
  name: "CF_API_KEY" | "CF_API_SECRET"
): Result<string> {
  const value = process.env[name];
  if (!value) {
    return err({
      code: "CONFIGURATION_ERROR",
      publicMessage: `${name} is required for authenticated Codeforces API calls`,
      retryable: false,
    });
  }

  return ok(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isContest(value: unknown): value is ContestSummary {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    typeof value.name === "string" &&
    value.name.length > 0
  );
}

function isProblem(value: unknown): value is ProblemSummary {
  return (
    isRecord(value) &&
    typeof value.contestId === "number" &&
    Number.isSafeInteger(value.contestId) &&
    value.contestId > 0 &&
    typeof value.index === "string" &&
    value.index.length > 0 &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    (value.rating === undefined || typeof value.rating === "number")
  );
}

function isContestWithProblems(value: unknown): value is ContestWithProblems {
  return (
    isRecord(value) &&
    isContest(value.contest) &&
    Array.isArray(value.problems) &&
    value.problems.every(isProblem)
  );
}

function invalidCodeforcesResponse() {
  return err({
    code: "CODEFORCES_INVALID_RESPONSE",
    publicMessage: "Codeforces returned an invalid response.",
    retryable: false,
  });
}

function parseCodeforcesResponse<T>(
  data: unknown,
  isValidResult: (value: unknown) => value is T
): Result<T> {
  if (
    !isRecord(data) ||
    data.status !== "OK" ||
    !isValidResult(data.result)
  ) {
    return invalidCodeforcesResponse();
  }

  return ok(data.result);
}

function logCodeforcesRequestError(operation: string, error: unknown): void {
  if (axios.isAxiosError(error)) {
    // Do not log the request URL: authenticated URLs contain API credentials.
    console.error(`[CFApiService.${operation}] Codeforces request failed`, {
      name: error.name,
      code: error.code,
      message: error.message,
      status: error.response?.status,
    });
    return;
  }

  console.error(`[CFApiService.${operation}] Codeforces request failed`, {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : "Unknown request error",
  });
}

function codeforcesRequestError() {
  return err({
    code: "CODEFORCES_ERROR",
    publicMessage: "Could not fetch data from Codeforces.",
    retryable: true,
  });
}

function generateAuthenticatedApiUrl(
  methodName: string,
  apiKey: string,
  apiSecret: string,
  params: Params = {}
): Result<string> {
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

  let rand: string;
  let hash: string;

  try {
    // 4. Generate random 6-char string
    rand = crypto.randomBytes(3).toString("hex");

    // 5. Create string to hash
    const stringToHash = `${rand}/${methodName}?${queryString}#${apiSecret}`;

    // 6. SHA-512 hash
    hash = crypto
      .createHash("sha512")
      .update(stringToHash)
      .digest("hex");
  } catch (error) {
    console.error("[CFApiService.generateAuthenticatedApiUrl] Crypto operation failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown crypto error",
    });
    return err({
      code: "INTERNAL_ERROR",
      publicMessage: "Could not prepare the authenticated Codeforces request.",
      retryable: true,
    });
  }

  // 7. Final apiSig
  const apiSig = `${rand}${hash}`;

  // 8. Final URL
  return ok(`${baseUrl}/${methodName}?${queryString}&apiSig=${apiSig}`);
}

export async function getAuthenticatedContestWithProblemByIdFromCF(
  contestID: number
): Promise<Result<ContestWithProblems>> {
  const apiKeyResult = getRequiredEnvironmentVariable("CF_API_KEY");
  if (isError(apiKeyResult)) return apiKeyResult;

  const apiSecretResult = getRequiredEnvironmentVariable("CF_API_SECRET");
  if (isError(apiSecretResult)) return apiSecretResult;

  const urlResult = generateAuthenticatedApiUrl(
    "contest.standings",
    apiKeyResult.value,
    apiSecretResult.value,
    { contestId: contestID, from: 1, count: 1, showUnofficial: false }
  );
  if (isError(urlResult)) return urlResult;

  try {
    const response = await axios.get<unknown>(urlResult.value, requestConfig);
    const result = parseCodeforcesResponse(response.data, isContestWithProblems);
    if (isError(result)) return result;
    if (
      result.value.contest.id !== contestID ||
      result.value.problems.some((problem) => problem.contestId !== contestID)
    ) {
      return invalidCodeforcesResponse();
    }

    return result;
  } catch (error) {
    logCodeforcesRequestError(
      "getAuthenticatedContestWithProblemByIdFromCF",
      error
    );
    return codeforcesRequestError();
  }
}

export async function getContestWithProblemByIdFromCF(
  contestID: number
): Promise<Result<ContestWithProblems>> {
  const url = `https://codeforces.com/api/contest.standings?contestId=${contestID}`;

  try {
    const response = await axios.get<unknown>(url, requestConfig);
    const result = parseCodeforcesResponse(response.data, isContestWithProblems);
    if (isError(result)) return result;
    if (
      result.value.contest.id !== contestID ||
      result.value.problems.some((problem) => problem.contestId !== contestID)
    ) {
      return invalidCodeforcesResponse();
    }

    return result;
  } catch (error) {
    logCodeforcesRequestError("getContestWithProblemByIdFromCF", error);
    return codeforcesRequestError();
  }
}

export async function getAllContestsFromCF(
  gym = false
): Promise<Result<ContestSummary[]>> {
  try {
    const response = await axios.get<unknown>(
      `https://codeforces.com/api/contest.list?lang=en&gym=${
        gym ? "true" : "false"
      }`,
      requestConfig
    );

    return parseCodeforcesResponse(
      response.data,
      (value): value is ContestSummary[] =>
        Array.isArray(value) && value.every(isContest)
    );
  } catch (error) {
    logCodeforcesRequestError("getAllContestsFromCF", error);
    return codeforcesRequestError();
  }
}
