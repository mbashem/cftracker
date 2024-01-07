"use client";
import { Contest, SharedContest } from "@prisma/client";
import { useMemo } from "react";
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Stack,
  Button,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SelectContest from "./SelectContest";
import { deleteSharedContestAction } from "../actions/DeleteActions";

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

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const [selectedContest, setSelectedContest] = useState<number>(-2);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  console.log(sharedContests, contests);

  return (
    <>
      <Button
        onClick={() => {
          console.log("set open");
          setSelectedContest(-1);
        }}
      >
        Create New Shared Contest
      </Button>
      <SelectContest
        parentContestId={selectedContest}
        onClose={() => {
          setSelectedContest(-2);
        }}
        contests={contests}
        onSelect={() => {}}
      />
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
                          onClick={() => {
                            setSelectedContest(rows[0].parentContestId);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        {/* <IconButton
                          aria-label="actions"
                          aria-controls="menu"
                          aria-haspopup="true"
                          onClick={handleClick}
                        >
                          <DeleteIcon />
                        </IconButton> */}
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
                            onClick={async () => {
                              await deleteSharedContestAction(subRow.contestId);
                            }}
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
    </>
  );
}
