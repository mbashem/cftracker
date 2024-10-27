import { useState } from "react";
import useTheme from "../../data/hooks/useTheme";
import useToast from "../../hooks/useToast";
import { List } from "../../types/list";
import { SearchKeys } from "../../util/constants";
import useAppSearchParams from "../../hooks/useSearchParam";
import { useNavigate } from "react-router";
import { Path } from "../../util/route/path";
import useListApi from "../../data/hooks/useListApi";
import { isDefined } from "../../util/util";

function useListPage() {
	const { theme } = useTheme();
	const [activeList, setActiveList] = useState<List | undefined>();
	const { showGeneralToast, showErrorToast } = useToast();
	const api = useListApi();
	const { data: lists, error, isLoading } = api.useGetAllListsQuery();
	const { updateSearchParam, deleteSearchParam } = useAppSearchParams();
	const navigate = useNavigate();

	function listClicked(listName: string) {
		let list = lists?.find(list => list.name === listName);
		setActiveList(list);
		if (isDefined(list))
			updateSearchParam(SearchKeys.ListId, list.id.toString());
		else
			deleteSearchParam(SearchKeys.ListId);
	}

	async function createNewList(listName: string) {
		console.log(listName);
		showGeneralToast(`Creating a list with name:${listName}.`);

		try {
			let res = await api.createList(listName);
			console.log(res);
		}
		catch (err: any) {
			showErrorToast(err?.message ?? "Failed to create the list!");
		}
	}

	async function updateListName(newName: string) {
		showGeneralToast(`Update list ${activeList?.name}, name to ${newName}`);
		if (activeList === undefined) throw new Error("No active list!");

		try {
			let res = await api.updateListName(activeList.id, newName);
			console.log(res);
			return;
		}
		catch (err: any) {
			showErrorToast(err?.message ?? "Failed to update list name!");
		}
	}

	function addButtonClicked() {
		if (activeList === undefined) return;
		navigate(Path.PROBLEMS + `?${SearchKeys.ListId}=${activeList.id}`);
	}

	async function deleteListButtonClicked() {
		if (activeList === undefined) return;
		try {
			let res = await api.deleteList(activeList.id);
			console.log(res);
			showGeneralToast("List deleted");
			deleteSearchParam(SearchKeys.ListId);
		} catch (err: any) {
			showErrorToast(err?.message ?? "Failed to delete the list");
		}
	}

	return {
		lists: lists ?? [],
		theme,
		listClicked,
		activeList,
		createNewList,
		error,
		isLoading,
		addButtonClicked,
		updateListName,
		deleteListButtonClicked,
	};
}

export default useListPage;