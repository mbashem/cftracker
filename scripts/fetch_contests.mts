// fetch all problems
import fs from "node:fs";

type Contest = {
  relativeTimeSeconds?: number;
  [key: string]: unknown;
};

type ContestListResponse = {
  status: string;
  result: Contest[];
};

const ALL_CONTEST_URL = "https://codeforces.com/api/contest.list?lang=en";
// const problemSetURL = "https://codeforces.com/api/problemset.problems?lang=en";

const update_contest_list = async (): Promise<void> => {
  console.log("FFF:");

  try {
    const response = await fetch(ALL_CONTEST_URL);

    console.log(response.status);
    const body = (await response.json()) as ContestListResponse;

    if (response.status === 200 && body.status === "OK") {
      body.result.forEach((contest) => {
        delete contest.relativeTimeSeconds;
      });

      const writable = `export const contests_data=${JSON.stringify(body)}`;

      fs.writeFile(
        "../src/data/saved_api/contests_data.ts",
        writable,
        (error) => {
          if (error) {
            console.error("Error Writing to filesystem:");
            throw error;
          }
          console.log("complete");
        },
      );
    } else {
      console.error("Failed");
    }
  } catch (error) {
    console.error("Error :");
    throw error;
  }
};

update_contest_list();
