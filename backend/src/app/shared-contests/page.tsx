import { getAllContests } from "@/features/contests/services/ContestService";
import groupContestAsShared from "@/features/shared-contests/services/GroupContestService";
import { Box, Button, Typography } from "@mui/material";

export default function Shared() {
  const groupContests = async (formData: FormData) => {
    "use server";
    console.log("Server: Grouping contests");

    const contestList = await getAllContests();
    await groupContestAsShared(contestList);
  };

  return (
    <Box>
      <Typography variant="h1">Shared</Typography>
      <form action={groupContests}>
        <Button type="submit">Group Contests</Button>
      </form>
    </Box>
  );
}
