import Image from "next/image";
import styles from "./page.module.css";
import {
  createOrUpdateContest,
  deleteAllContests,
  fetchAndSaveAllContests,
  getAllContests,
} from "@/features/contests/services/ContestDBService";
import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import {
  createOrUpdateProblem,
  deleteAllProblems,
  getAllProblems,
} from "@/features/problems/services/ProblemDBService";
import { readFile, readFileSync, writeFileSync } from "fs";
import {
  createOrUpdateSharedContest,
  deleteAllSharedContests,
  getAllSharedContests,
} from "@/features/shared-contests/services/SharedContestsDBService";
import { fetchAndSaveProblemsByContestId } from "@/features/problems/services/ProblemService";
import { sleep } from "@/utils/utils";
import { Contest, Problem, SharedContest } from "@/prisma/generated/client/client";

export default function Home() {
  const fetchContestFromCF = async (formData: FormData) => {
    "use server";
    console.log("Server: fethcing contest from CF");

    const contestList = await fetchAndSaveAllContests();

    console.log(contestList);
  };

  const saveDB = async () => {
    "use server";
    console.log("Server: saving DB");
    const problems = await getAllProblems();
    writeFileSync("src/saved-db/problems.json", JSON.stringify(problems));

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

    for (let contest of contests) {
      await createOrUpdateContest(contest.contestId, contest.name);
    }

    const problems = JSON.parse(readFileSync("src/saved-db/problems.json", "utf-8")) as Problem[];

    for (let problem of problems) {
      await createOrUpdateProblem(
        problem.contestId,
        problem.index,
        problem.name,
        problem.rating === null ? undefined : problem.rating
      );
    }

    const sharedContests = JSON.parse(readFileSync("src/saved-db/shared-contests.json", "utf-8")) as SharedContest[];

    for (let sharedContest of sharedContests) {
      await createOrUpdateSharedContest(sharedContest.contestId, sharedContest.parentContestId);
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

    for (let contest of contests) {
      try {
        await fetchAndSaveProblemsByContestId(contest.contestId);
      } catch (e) {
        console.log(e);
        console.log("Error in fetching contest:", contest.contestId);
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
