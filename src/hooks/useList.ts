import { listApi } from "../data/queries/listQuery";

function useList() {
	const [createListQuery] = listApi.useCreateListMutation();
	const [addProblemToListQuery] = listApi.useAddToListMutation();


	async function createList(listName: string) {
		try {
			const list: any = await createListQuery({ name: listName }).unwrap();
			return list;
		} catch (err: any) {
			console.log(err);
			let errorMessage = err?.data?.error ?? "Failed to create a list!";
			throw new Error(errorMessage);
		}
	}

	async function addProblemToList(listId: number, problemId: string) {
		try {
			const list: any = await addProblemToListQuery({listId, problemId}).unwrap();
			return list;
		} catch (err: any) {
			console.log(err);
			let errorMessage = err?.data?.error ?? "Failed to create a list!";
			throw new Error(errorMessage);
		}
	}

	return { createList, addProblemToList };
}

export default useList;