import {
  Button,
  Container,
  Paper,
} from "@mui/material";
import { groupContests } from "./actions/GroupContestAction";
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
      <form action={groupContests}>
        <Button type="submit">Group Contests</Button>
      </form>
      <SharedContestList
        sharedContests={sharedContests}
        contests={contests}
        fetchedContests={fetchedContests}
      />
    </Container>
  );
}
