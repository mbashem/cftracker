"use client";
import { Contest, SharedContest } from "@prisma/client";
import { useMemo } from "react";
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Stack,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

interface Props {
  sharedContests: SharedContest[][];
  contests: Contest[];
}

export default function SharedContestList({ sharedContests, contests }: Props) {
  const contestNameMap = useMemo(() => {
    const map = new Map<number, string>();
    contests.forEach((contest) => {
      map.set(contest.contestId, contest.name);
    });
    return map;
  }, []);

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  console.log(sharedContests, contests);

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Parent ID</TableCell>
            <TableCell>Contest ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sharedContests.map((rows) => {
            return (
              <React.Fragment key={"parent_" + rows[0].parentContestId}>
                <TableRow>
                  <TableCell>{rows[0].parentContestId}</TableCell>
                  <TableCell>{rows[0].parentContestId}</TableCell>
                  <TableCell>
                    {contestNameMap.get(rows[0].parentContestId)}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" justifyContent={"flex-end"}>
                      <IconButton
                        aria-label="actions"
                        aria-controls="menu"
                        aria-haspopup="true"
                        onClick={handleClick}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        aria-label="actions"
                        aria-controls="menu"
                        aria-haspopup="true"
                        onClick={handleClick}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
                {rows.map((subRow) => (
                  <TableRow key={"sub_" + subRow.contestId}>
                    <TableCell></TableCell>
                    <TableCell>{subRow.contestId}</TableCell>
                    <TableCell>
                      {contestNameMap.get(subRow.contestId) ?? "undefined"}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" justifyContent={"flex-end"}>
                        <IconButton
                          aria-label="actions"
                          aria-controls="menu"
                          aria-haspopup="true"
                          onClick={handleClick}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
