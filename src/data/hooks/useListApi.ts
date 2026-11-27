import { skipToken } from "@reduxjs/toolkit/query";
import { useCallback } from "react";
import { listApi } from "../queries/listQuery";
import useUser from "../../hooks/useUser";
import type { ListItemInput, PracticeFields } from "../../types/list";

function useListApi() {
	const { user } = useUser();
	const [createListMutation] = listApi.useCreateListMutation();
	const [addProblemToListMutation] = listApi.useAddToListMutation();
	const [deleteListMutation] = listApi.useDeleteListMutation();
	const [updateListMutation] = listApi.useUpdateListNameMutation();
	const [fetchIndividualListQuery] = listApi.useLazyGetListQuery();
	const [deleteProblemFromListMutation] = listApi.useDeleteFromListMutation();
	const [updateListItemMutation] = listApi.useUpdateListItemMutation();
	const [moveListItemsMutation] = listApi.useMoveListItemsMutation();

	async function getListWithItems(listId: number) {
		try {
			const list = await fetchIndividualListQuery(listId).unwrap();
			return list;
		} catch (err: any) {
			console.log(err);
			let errorMessage = err?.data?.error ?? "Couldn't find the list";
			throw new Error(errorMessage);
		}
	}

	async function createList(listName: string) {
		try {
			const list: any = await createListMutation({ name: listName }).unwrap();
			return list;
		} catch (err: any) {
			console.log(err);
			let errorMessage = err?.data?.error ?? "Failed to create a list!";
			throw new Error(errorMessage);
		}
	}

	/** Insert a batch before one existing problem; omit the anchor to prepend. */
	function addProblemsToList(listId: number, problemIds: string[], beforeProblemId?: string) {
		return addListItems(listId, problemIds.map(problemId => ({ problemId })), beforeProblemId);
	}

	async function addListItems(listId: number, items: ListItemInput[], beforeProblemId?: string) {
		try {
			return await addProblemToListMutation({ listId, items, beforeProblemId }).unwrap();
		} catch (err: any) {
			console.log(err);
			let errorMessage = err?.data?.error ?? "Failed to add to list!";
			throw new Error(errorMessage);
		}
	}

	const updateListItem = useCallback(async (listId: number, problemId: string, patch: PracticeFields) => {
		try {
			return await updateListItemMutation({ listId, problemId, patch }).unwrap();
		} catch (error) {
			throw new Error(listMutationError(error, "Failed to save practice details."));
		}
	}, [updateListItemMutation]);

	async function moveListItems(listId: number, problemIds: string[], beforeProblemId?: string) {
		try {
			return await moveListItemsMutation({ listId, problemIds, beforeProblemId }).unwrap();
		} catch (error) {
			throw new Error(listMutationError(error, "Failed to move list items."));
		}
	}

	/** Remove one or more problems through the sole bulk-remove contract. */
 async function removeProblemsFromList(listId: number, problemIds: string[]) {
		try {
			return await deleteProblemFromListMutation({ listId, problemIds }).unwrap();
		} catch (err: any) {
			console.log(err);
			let errorMessage = err?.data?.error ?? "Failed to delete from list!";
			throw new Error(errorMessage);
		}
	}

	async function deleteList(listId: number) {
		try {
			const list: any = await deleteListMutation(listId).unwrap();
			return list;
		} catch (err: any) {
			console.log(err);
			let errorMessage = err?.data?.error ?? "Failed to delete the list!";
			throw new Error(errorMessage);
		}
	}

	async function updateListName(listId: number, newName: string) {
		try {
			const list: any = await updateListMutation({ listId, name: newName }).unwrap();
			return list;
		} catch (err: any) {
			console.log(err);
			let errorMessage = err?.data?.error ?? "Failed to update the list!";
			throw new Error(errorMessage);
		}
	}

	function useGetAllListsQuery(options: { skip?: boolean } = {}) {
		const query = listApi.useGetAllListsQuery(undefined, { skip: user === undefined || options.skip });
		return { ...query, data: user === undefined ? undefined : query.currentData };
	}

	function useGetListQuery(listId: number | undefined) {
		const query = listApi.useGetListQuery(user === undefined ? skipToken : listId ?? skipToken);
		return { ...query, data: listId === undefined || user === undefined ? undefined : query.currentData };
	}

	return {
		getListWithItems, createList, addProblemsToList, addListItems, removeProblemsFromList,
		updateListItem, moveListItems, deleteList, updateListName, useGetAllListsQuery, useGetListQuery,
	};
}

function listMutationError(error: unknown, fallback: string) {
	const message = (error as { data?: { error?: unknown } } | undefined)?.data?.error;
	return typeof message === "string" ? message : fallback;
}
export default useListApi;
