// fetch all problems
import fs from "node:fs";

type ProblemsetResponse = {
  status: string;
  result: unknown;
};

//const ALL_CONTEST_URL = "https://codeforces.com/api/contest.list?lang=en";
const ALL_PROBLEMS_URL = "https://codeforces.com/api/problemset.problems?lang=en";

const update_problems_list = async (): Promise<void> => {
  try {
    const response = await fetch(ALL_PROBLEMS_URL);

    console.log(response.status);
    const body = (await response.json()) as ProblemsetResponse;

    if (response.status === 200 && body.status === "OK") {
      const writable = `${JSON.stringify(body)}\n`;

      fs.writeFile(
        "../src/data/saved_api/problems_data.json",
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

update_problems_list();
