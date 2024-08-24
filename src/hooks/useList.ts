import { listApi } from "../data/queries/listQuery";

function useList() {
	const [createListQuery] = listApi.useCreateListMutation();
	const { data: lists, error: errorGettingAllList, isLoading: isAllListLoading, refetch: refetchList } = listApi.useGetAllListsQuery();

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

	return { createList, lists: lists ?? [], errorGettingAllList, isAllListLoading, refetchList };
}

export default useList;