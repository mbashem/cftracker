import {
  createOrUpdateContest,
  fetchAndSaveAllContests,
  getAllContests,
} from "@/features/contests/services/ContestDBService";
import { Button, Container, Paper, Stack } from "@mui/material";
import {
  createOrUpdateProblem,
  deleteAllProblems,
  getAllProblems,
} from "@/features/problems/services/ProblemDBService";
import { readFileSync, writeFileSync } from "fs";
import {
  createOrUpdateSharedContest,
  deleteAllSharedContests,
  getAllSharedContests,
} from "@/features/shared-contests/services/SharedContestsDBService";
import { fetchAndSaveProblemsByContestId } from "@/features/problems/services/ProblemService";
import { isError } from "@/utils/result";
import { sleep } from "@/utils/utils";
import { Contest, Problem, SharedContest } from "@/prisma/generated/client/client";

export default function Home() {
  const fetchContestFromCF = async () => {
    "use server";
    console.log("Server: fethcing contest from CF");

    const contestResult = await fetchAndSaveAllContests();
    if (isError(contestResult)) {
      console.error("Unable to fetch contests from Codeforces", contestResult.error);
      return;
    }

    console.log(contestResult.value);
  };

  const saveDB = async () => {
    "use server";
    console.log("Server: saving DB");
    const problemsResult = await getAllProblems();
    if (isError(problemsResult)) {
      console.error("Unable to load problems for the database snapshot", problemsResult.error);
      return;
    }
    writeFileSync("src/saved-db/problems.json", JSON.stringify(problemsResult.value));

    const contests = await getAllContests();
    writeFileSync("src/saved-db/contests.json", JSON.stringify(contests));

    const sharedContests = await getAllSharedContests();
    writeFileSync("src/saved-db/shared-contests.json", JSON.stringify(sharedContests));

    console.log("Server: saved DB");
  };

  const syncDB = async () => {
    "use server";
    console.log("Server: syning DB");
    const contests = JSON.parse(readFileSync("src/saved-db/contests.json", "utf-8")) as Contest[];

    for (const contest of contests) {
      const contestResult = await createOrUpdateContest(contest.contestId, contest.name);
      if (isError(contestResult)) {
        console.error("Unable to restore contest", contestResult.error);
        return;
      }
    }

    const problems = JSON.parse(readFileSync("src/saved-db/problems.json", "utf-8")) as Problem[];

    for (const problem of problems) {
      const problemResult = await createOrUpdateProblem(
        problem.contestId,
        problem.index,
        problem.name,
        problem.rating === null ? undefined : problem.rating
      );
      if (isError(problemResult)) {
        console.error("Unable to restore problem", problemResult.error);
        return;
      }
    }

    const sharedContests = JSON.parse(readFileSync("src/saved-db/shared-contests.json", "utf-8")) as SharedContest[];

    for (const sharedContest of sharedContests) {
      const sharedContestResult = await createOrUpdateSharedContest(
        sharedContest.contestId,
        sharedContest.parentContestId
      );
      if (isError(sharedContestResult)) {
        console.error("Unable to restore shared contest", sharedContestResult.error);
        return;
      }
    }
    console.log("Server: synced DB");
  };

  const dropDB = async () => {
    "use server";
    console.log("Server: dropping DB");
    await deleteAllProblems();
    // await deleteAllContests();
    await deleteAllSharedContests();
  };

  const fetchAllProblems = async () => {
    "use server";
    const contests = await getAllContests();
    // await fetchAndSaveProblemsByContestId(1887);
    console.log("Fetching ALl problems");

    for (const contest of contests) {
      const result = await fetchAndSaveProblemsByContestId(contest.contestId);
      if (isError(result)) {
        console.error("Error in fetching contest", {
          contestId: contest.contestId,
          error: result.error
        });
        continue;
      }
      console.log("Fetching ALl problems of contest:", contest.contestId);
      await sleep(2500);
    }
    console.log("Fetced ALl problems");
  };

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      {/* Actions */}
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <form action={fetchContestFromCF}>
            <Button fullWidth variant="contained" type="submit">
              Fetch All Contests From CF
            </Button>
          </form>

          <form action={saveDB}>
            <Button fullWidth variant="outlined" type="submit">
              Save DB
            </Button>
          </form>

          <form action={syncDB}>
            <Button fullWidth variant="outlined" type="submit">
              Sync From Saved DB
            </Button>
          </form>

          <form action={dropDB}>
            <Button fullWidth color="error" variant="outlined" type="submit">
              Drop All DB
            </Button>
          </form>

          <form action={fetchAllProblems}>
            <Button fullWidth variant="contained" color="secondary" type="submit">
              Fetch All Problems
            </Button>
          </form>
        </Stack>
      </Paper>
    </Container>
  );
}
