import {
  Button,
  Container,
  Paper,
  Stack,
} from "@mui/material";
import { groupContestsAction, saveSharedContestsToFileAction } from "./actions/SharedContestActions";
import SharedContestList from "./components/SharedContestList";

export default async function SharedContestsPage() {
  const data = await fetch("http://localhost:3000/api/shared-contests", {
    cache: "no-store",
  });
  const sharedContests = await data.json();

  const contestsData = await fetch("http://localhost:3000/api/contests", {
    cache: "no-store",
  });

  const fetchedContestsData = await fetch(
    "http://localhost:3000/api/contests/fetched",
    {
      cache: "no-store",
    }
  );

  const fetchedContests = await fetchedContestsData.json();
  const contests = await contestsData.json();

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
