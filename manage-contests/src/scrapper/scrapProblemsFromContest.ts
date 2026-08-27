import * as cheerio from "cheerio";
import axios from "axios";
import { Problem } from "@/prisma/generated/client/client";
import { err, ok, Result } from "@/utils/result";

const getUrl = (contestId: number): string => {
  return "https://codeforces.com/contest/" + contestId.toString() + "/";
};

function invalidScrapeResponse() {
  return err({
    code: "CODEFORCES_INVALID_RESPONSE",
    publicMessage: "Codeforces returned an unrecognized contest problem page.",
    retryable: false,
  });
}

const scrapProblemsFromContest = async (
  contestId: number = 1509
): Promise<Result<Problem[]>> => {
  const url = getUrl(contestId);
  console.log(url);
  const problemNameSelector: string = "div a";
  const problemIndexInRow: string = "#pageContent .left a";

  try {
    const pageData = await axios.get(url, {
      timeout: 30_000,
      maxContentLength: 10 * 1024 * 1024,
    });
    if (typeof pageData.data !== "string") return invalidScrapeResponse();

    const data = cheerio.load(pageData.data);
    const problemNames = data(problemNameSelector);
    const problemIndexes = data(problemIndexInRow);
    const names: string[] = [];
    const indexes: string[] = [];

    for (const problemName of problemNames.toArray())
      names.push(data(problemName).text().trim());
    for (const problemIndex of problemIndexes.toArray())
      indexes.push(data(problemIndex).text().trim());

    if (
      names.length === 0 ||
      names.length !== indexes.length ||
      names.some((name) => name.length === 0) ||
      indexes.some((index) => index.length === 0)
    ) {
      return invalidScrapeResponse();
    }

    console.log(names);
    console.log(indexes);

    const problems: Problem[] = [];
    for (let i = 0; i < names.length; i++) {
      problems.push({
        contestId,
        index: indexes[i],
        name: names[i],
        rating: null,
      });
    }
    console.log(problems);

    return ok(problems);
  } catch (cause) {
    console.error("[scrapProblemsFromContest] Codeforces scrape failed", cause);
    return err({
      code: "CODEFORCES_ERROR",
      publicMessage: "Could not fetch problems from Codeforces.",
      retryable: true,
    });
  }
};

// contestScrapper();

export default scrapProblemsFromContest;
