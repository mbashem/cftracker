import { listApi } from "../queries/listQuery";

function useListApi() {
	const [createListMutation] = listApi.useCreateListMutation();
	const [addProblemToListMutation] = listApi.useAddToListMutation();
	const [deleteListMutation] = listApi.useDeleteListMutation();
	const [updateListMutation] = listApi.useUpdateListNameMutation();
	const [fetchIndividualListQuery] = listApi.useLazyGetListQuery();
	const [deleteProblemFromListMutation] = listApi.useDeleteFromListMutation();

	async function getList(listId: number) {
		try {
			const list = await fetchIndividualListQuery(listId).unwrap();
			return list.items;
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

	async function addProblemToList(listId: number, problemId: string) {
		try {
			const list: any = await addProblemToListMutation({ listId, problemId }).unwrap();
			return list;
		} catch (err: any) {
			console.log(err);
			let errorMessage = err?.data?.error ?? "Failed to add to list!";
			throw new Error(errorMessage);
		}
	}

	async function deleteProblemFromList(listId: number, problemId: string) {
		try {
			await deleteProblemFromListMutation({ listId, problemId }).unwrap();
			return;
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

	return { getList, createList, addProblemToList, deleteProblemFromList, deleteList, updateListName, useGetAllListsQuery: listApi.useGetAllListsQuery, useGetListQuery: listApi.useGetListQuery };
}

export default useListApi;