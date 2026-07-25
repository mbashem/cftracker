import {
  Button,
  Container,
  Paper,
  Stack,
} from "@mui/material";
import { getAllContests } from "@/features/contests/services/ContestDBService";
import { getFetchedProblemsContestIdList } from "@/features/problems/services/ProblemDBService";
import { connection } from "next/server";
import { groupContestsAction, saveSharedContestsToFileAction } from "./actions/SharedContestActions";
import SharedContestList from "./components/SharedContestList";
import { getAllSharedContestGroupByParent } from "./services/SharedContestsDBService";

export default async function SharedContestsPage() {
  await connection();

  const [sharedContests, contests, fetchedContests] = await Promise.all([
    getAllSharedContestGroupByParent(),
    getAllContests(),
    getFetchedProblemsContestIdList(),
  ]);

  return (
    <Container component={Paper}>
      <Stack direction="row" spacing={2} alignItems="center">
        <form action={groupContestsAction}>
          <Button type="submit">Group Contests</Button>
        </form>
        <form action={saveSharedContestsToFileAction}>
          <Button type="submit">Save All Shared Contests To path: /src/data/saved_api/related.ts</Button>
        </form>
      </Stack>
      <SharedContestList
        sharedContests={sharedContests}
        contests={contests}
        fetchedContests={fetchedContests}
      />
    </Container>
  );
}
