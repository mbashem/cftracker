import { listApi } from "../queries/listQuery";
import useUser from "../../hooks/useUser";

function useListApi() {
	const { user } = useUser();
	const [createListMutation] = listApi.useCreateListMutation();
	const [addProblemToListMutation] = listApi.useAddToListMutation();
	const [deleteListMutation] = listApi.useDeleteListMutation();
	const [updateListMutation] = listApi.useUpdateListNameMutation();
	const [fetchIndividualListQuery] = listApi.useLazyGetListQuery();
	const [deleteProblemFromListMutation] = listApi.useDeleteFromListMutation();

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
 async function addProblemsToList(listId: number, problemIds: string[], beforeProblemId?: string) {
		try {
			return await addProblemToListMutation({ listId, problemIds, beforeProblemId }).unwrap();
		} catch (err: any) {
			console.log(err);
			let errorMessage = err?.data?.error ?? "Failed to add to list!";
			throw new Error(errorMessage);
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

	function useGetListQuery(listId: number) {
		const query = listApi.useGetListQuery(listId, { skip: user === undefined });
		return { ...query, data: user === undefined ? undefined : query.currentData };
	}

	return { getListWithItems, createList, addProblemsToList, removeProblemsFromList, deleteList, updateListName, useGetAllListsQuery, useGetListQuery };
}

export default useListApi;
