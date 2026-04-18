"use client";
import { use, useMemo } from "react";
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
import { deleteSharedContestAction } from "../actions/SharedContestActions";
import CachedIcon from "@mui/icons-material/Cached";
import CheckIcon from "@mui/icons-material/Check";
import FileCopyIcon from '@mui/icons-material/FileCopy';
import AddIcon from '@mui/icons-material/Add';
import { Contest, SharedContest } from "@/prisma/generated/client/client";
import ContestDetails from "./ContestDetails";
import { useRouter } from "next/dist/client/components/navigation";
import { fetchAndSaveProblemsAction, scrapAndSaveProblemsAction } from "../actions/ProblemActions";

interface Props {
  sharedContests: SharedContest[][];
  contests: Contest[];
  fetchedContests: number[];
}

export default function SharedContestList({ sharedContests, contests, fetchedContests }: Props) {
  const contestNameMap = useMemo(() => {
    const map = new Map<number, string>();
    contests.forEach((contest) => {
      map.set(contest.contestId, contest.name);
    });
    return map;
  }, []);

  const router = useRouter();
  const [selectedContest, setSelectedContest] = useState<Contest | undefined>(undefined);
  const [selectedContestForDetails, setSelectedContestForDetails] = useState<Contest | undefined>(undefined);

  console.log(sharedContests, contests);

  return (
    <>
      <Button
        onClick={() => {
          console.log("set open");
          setSelectedContest({ contestId: -1, name: "", id: "" } as Contest);
        }}
        disableRipple
      >
        Create New Shared Contest
      </Button>
      <SelectContest
        parentContest={selectedContest}
        onClose={() => {
          setSelectedContest(undefined);
        }}
        contests={contests.filter((contest) => {
          return !sharedContests.flatMap((rows) => rows.map((row) => row.contestId)).includes(contest.contestId);
        })}
        onSelect={() => { }}
      />
      <ContestDetails
        contest={selectedContestForDetails}
        onClose={() => {
          setSelectedContestForDetails(undefined);
          router.refresh();
        }}
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
                    <TableCell>{contestNameMap.get(rows[0].parentContestId)}</TableCell>
                    <TableCell>
                      <Stack direction="row" justifyContent={"flex-end"}>
                        <IconButton
                          aria-label="actions"
                          aria-controls="menu"
                          aria-haspopup="true"
                          onClick={() => {
                            setSelectedContest(contests.find((value) => value.contestId === rows[0].contestId) ?? undefined);
                          }}
                          disableRipple
                        >
                          <EditIcon />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                  {rows.map((subRow) => (
                    <TableRow key={"sub_" + subRow.contestId}>
                      <TableCell></TableCell>
                      <TableCell>{subRow.contestId}</TableCell>
                      <TableCell>{contestNameMap.get(subRow.contestId) ?? "undefined"}</TableCell>
                      <TableCell>
                        <Stack direction="row" justifyContent={"flex-end"}>
                          {fetchedContests.includes(subRow.contestId) && (
                            <>
                              <IconButton
                                aria-label="actions"
                                aria-controls="menu"
                                aria-haspopup="true"
                                disableRipple
                                disabled
                              >
                                <CheckIcon />
                              </IconButton>
                            </>
                          )}

                          <IconButton
                            aria-label="actions"
                            aria-controls="menu"
                            aria-haspopup="true"
                            onClick={() => setSelectedContestForDetails(contests.find((value) => value.contestId === subRow.contestId))}
                            disableRipple
                          >
                            <AddIcon />
                          </IconButton>

                          <IconButton
                            aria-label="actions"
                            aria-controls="menu"
                            aria-haspopup="true"
                            onClick={async () => {
                              const res = await fetchAndSaveProblemsAction(subRow.contestId);
                              console.log(res);
                            }}
                            disableRipple
                          >
                            <CachedIcon />
                          </IconButton>

                          <IconButton
                            aria-label="actions"
                            aria-controls="menu"
                            aria-haspopup="true"
                            onClick={async () => {
                              const res = await scrapAndSaveProblemsAction(subRow.contestId);
                              console.log(res);
                            }}
                            disableRipple
                          >
                            <FileCopyIcon />
                          </IconButton>

                          <IconButton
                            aria-label="actions"
                            aria-controls="menu"
                            aria-haspopup="true"
                            onClick={async () => {
                              await deleteSharedContestAction(subRow.contestId);
                            }}
                            disableRipple
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
