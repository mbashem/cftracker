"use client";
import { Box, Button, Modal, Stack, TextField } from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import DeleteIcon from '@mui/icons-material/Delete';

import { useEffect, useState } from "react";
import { Contest, Problem } from "@/prisma/generated/client/client";
import QuickFIlterToolbar from "@/components/QuickFilterToolbar";
import { addProblemAction } from "../actions/ProblemActions";
import Link from "next/dist/client/link";
import { deleteProblem } from "@/features/problems/services/ProblemDBService";

interface Props {
	contest: Contest | undefined;
	onClose: () => void;
}

export default function ContestDetails({ contest, onClose }: Props) {
	const [open, setOpen] = useState(false);
	const handleOpen = () => setOpen(true);
	const handleClose = () => {
		onClose();
		setOpen(false);
	};
	const [problems, setProblems] = useState<Problem[]>([]);

	async function fetchProblems() {
		if (contest === undefined) {
			setProblems([]);
			return;
		}

		try {
			const res = await fetch(`/api/contests/${contest.contestId}/problems`);
			const jsonData = await res.json();
			setProblems(jsonData.problems);
		} catch (error) {
			console.error("Error fetching problems:", error);
			setProblems([]);
		}
	}

	useEffect(() => {
		console.log("contest: ", contest);
		if (contest !== undefined) {
			handleOpen();
			fetchProblems();
		}
		else handleClose();
	}, [contest]);

	const [newProblem, setNewProblem] = useState({
		index: "",
		name: "",
	});
	console.log(problems);

	async function handleSubmitNewProblem() {
		if (contest === undefined || newProblem.index === "" || newProblem.name === "") return;
		console.log("submit: ", newProblem);
		await addProblemAction(contest!.contestId, newProblem.index, newProblem.name);
		setNewProblem({
			index: "",
			name: "",
		});
		await fetchProblems();
	}

	const columns: GridColDef[] = [
		{
			field: "contestId",
			headerName: "Contest ID",
			width: 90
		},
		{
			field: "index",
			headerName: "Index",
			width: 100,
		},
		{
			field: "name",
			headerName: "Name",
			width: 450,
		},
		{
			field: "Delete",
			width: 150,
			renderCell: (params: GridRenderCellParams<any, Date>) => (
				<Button
					variant="outlined"
					color="error"
					style={{ marginLeft: 16 }}
					onClick={async () => {
						await deleteProblem(params.row.contestId, params.row.index);
						await fetchProblems();
					}}
				>
					<DeleteIcon />
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
				<Box
					sx={{
						position: "absolute",
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
					}}
				>
					<Link href={`https://codeforces.com/contest/${contest?.contestId}`} target="_blank" rel="noopener">
						ContestID: {contest?.contestId} - {contest?.name}
					</Link>
					<Stack style={{ marginTop: 10 }} direction="row" spacing={2}>
						<TextField
							label="Index"
							variant="outlined"
							size="small"
							value={newProblem.index}
							onChange={(e) => setNewProblem((prev) => ({ ...prev, index: e.target.value }))}
						/>

						<TextField
							label="Name"
							variant="outlined"
							size="small"
							fullWidth
							value={newProblem.name}
							onChange={(e) => setNewProblem((prev) => ({ ...prev, name: e.target.value }))}
						/>

						<Button
							variant="contained"
							onClick={handleSubmitNewProblem}
						>
							Submit
						</Button>
					</Stack>
					<Box>
						<DataGrid
							rows={problems}
							getRowId={(row) => row.index}
							columns={columns}
							initialState={{
								pagination: {
									paginationModel: {
										pageSize: 10,
									},
								},
							}}
							pageSizeOptions={[10, 15]}
							disableRowSelectionOnClick
							disableColumnFilter
							disableColumnSelector
							slots={{ toolbar: QuickFIlterToolbar }}
							showToolbar
						/>
					</Box>
				</Box>
			</Modal >
		</>
	);
}
