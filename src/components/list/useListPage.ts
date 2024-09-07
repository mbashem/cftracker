import { useState } from "react";
import useTheme from "../../data/hooks/useTheme";
import useToast from "../../hooks/useToast";
import useList from "../../hooks/useList";
import { List } from "../../types/list";
import { listApi } from "../../data/queries/listQuery";
import { SearchKeys } from "../../util/constants";
import useAppSearchParams from "../../hooks/useSearchParam";
import { useNavigate } from "react-router";
import { Path } from "../../util/route/path";

function useListPage() {
	const { theme } = useTheme();
	const [activeList, setActiveList] = useState<List | undefined>();
	const { popGeneralToast, popErrorToast } = useToast();
	const { createList } = useList();
	const { data: lists, error, isLoading, refetch } = listApi.useGetAllListsQuery();
	const { searchParams, updateSearchParam, deleteSearchParam } = useAppSearchParams();
	const navigate = useNavigate();

	function listClicked(listName: string) {
		let list = lists?.find(list => list.name === listName);
		setActiveList(list);
		if (list !== undefined)
			updateSearchParam(SearchKeys.ListId, list.id.toString());
		else
			deleteSearchParam(SearchKeys.ListId);
	}

	async function createNewList(listName: string) {
		console.log(listName);
		popGeneralToast(`Creating a list with name:${listName}.`);

		try {
			const list = await createList(listName);
			console.log(list);
			// refetchList();
		} catch (err: any) {
			console.log(err);
			popErrorToast(err?.message ?? "Failed to create the list!");
			throw err;
		}
	}

	function addButtonClicked() {
		if (activeList === undefined) return;

		navigate(Path.PROBLEMS + `?${SearchKeys.ListId}=${activeList.id}`);
	}

	return {
		lists: lists ?? [],
		theme,
		listClicked,
		activeList,
		createNewList,
		error,
		isLoading,
		addButtonClicked
	};
}

export default useListPage;