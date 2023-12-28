"use client";
"use client";
import { Button, Box, Typography } from "@mui/material";
import { groupContests } from "./actions/GroupContestAction";
import SharedContestList from "./components/SharedContestList";

export default async function SharedContestsPage() {
  const data = await fetch("http://localhost:3000/api/shared-contests");
  const sharedContests = await data.json();

  const contestsData = await fetch("http://localhost:3000/api/contests");
  const contests = await contestsData.json();

  return (
    <Box>
      <form action={groupContests}>
        <Button type="submit">Group Contests</Button>
      </form>
      <SharedContestList sharedContests={sharedContests} contests={contests} />
    </Box>
  );
}
