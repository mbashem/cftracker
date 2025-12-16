"use client";
import { Box, Button, Modal, Typography } from "@mui/material";
import { Contest } from "@/prisma/generated/client/client";
import { useEffect, useState } from "react";
import { DataGrid, GridColDef, GridRenderCellParams, GridToolbarQuickFilter } from "@mui/x-data-grid";
import { createSharedContest } from "../actions/GroupContestAction";

const style = {
  position: "absolute" as "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 800,
  bgcolor: "background.paper",
  color: "black",
  border: "2px solid #000",
  boxShadow: 24,
  overflow: "scroll",
  p: 4,
};

interface Props {
  parentContest: Contest | null;
  onClose: () => void;
  onSelect: (contestId: number) => void;
  contests: Contest[];
}

export default function SelectContest({ parentContest, onClose, onSelect, contests }: Props) {
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    onClose();
    setOpen(false);
  };

  useEffect(() => {
    console.log("parentContest: ", parentContest);
    if (parentContest !== null) handleOpen();
  }, [parentContest]);

  const columns: GridColDef[] = [
    { field: "contestId", headerName: "contestId", width: 90 },
    {
      field: "name",
      headerName: "name",
      width: 450,
    },
    {
      field: "Select",
      width: 150,
      renderCell: (params: GridRenderCellParams<any, Date>) => (
        <Button
          variant="contained"
          size="small"
          style={{ marginLeft: 16 }}
          tabIndex={params.hasFocus ? 0 : -1}
          onClick={async () => {
            onSelect(params.row.contestId);
            if (parentContest?.contestId === -1) {
              await createSharedContest(params.row.contestId, params.row.contestId);
            } else {
              if (parentContest !== null) await createSharedContest(parentContest.contestId, params.row.contestId);
            }
            handleClose();
          }}
        >
          Select
        </Button>
      ),
    },
  ];

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="parent-modal-title"
        aria-describedby="parent-modal-description"
      >
        <Box sx={style}>
          <Typography id="parent-modal-title" variant="h6" component="h2">
            Parent ID:{parentContest?.contestId} , Name: {parentContest?.name}
          </Typography>
          <Box>
            <DataGrid
              rows={contests}
              getRowId={(row) => row.contestId}
              columns={columns}
              initialState={{
                pagination: {
                  paginationModel: {
                    pageSize: 5,
                  },
                },
              }}
              pageSizeOptions={[5, 10, 15]}
              disableRowSelectionOnClick
              slots={{ toolbar: GridToolbarQuickFilter }}
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                },
              }}
            />
          </Box>
        </Box>
      </Modal>
    </>
  );
}
