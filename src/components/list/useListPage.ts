import useTheme from "../../data/hooks/useTheme";
import useToast from "../../hooks/useToast";
import { SearchKeys } from "../../util/constants";
import useAppSearchParams from "../../hooks/useSearchParam";
import { Path } from "../../util/route/path";
import useListApi from "../../data/hooks/useListApi";
import { isDefined } from "../../util/util";
import { EMPTY_ARRAY } from "../../util/constants";
import useAppNavigation from "../../hooks/useAppNavigation";

function useListPage() {
	const { theme } = useTheme();
	const { showGeneralToast, showErrorToast } = useToast();
	const api = useListApi();
	const { data: lists, error, isLoading } = api.useGetAllListsQuery();
	const { getSearchParam, updateSearchParam, deleteSearchParam } = useAppSearchParams();
	const { navigateTo } = useAppNavigation();
	const listId = getSearchParam(SearchKeys.ListId);
	const activeList = lists?.find(list => list.id.toString() === listId);

	function listClicked(listName: string) {
		let list = lists?.find(list => list.name === listName);
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
			return true;
		}
		catch (err: any) {
			showErrorToast(err?.message ?? "Failed to create the list!");
			return false;
		}
	}

	async function updateListName(newName: string) {
		showGeneralToast(`Update list ${activeList?.name}, name to ${newName}`);
		if (activeList === undefined) throw new Error("No active list!");

		try {
			let res = await api.updateListName(activeList.id, newName);
			console.log(res);
			return true;
		}
		catch (err: any) {
			showErrorToast(err?.message ?? "Failed to update list name!");
			return false;
		}
	}

	function addButtonClicked() {
		if (activeList === undefined) return;
		navigateTo(Path.PROBLEMS, {
			[SearchKeys.ListId]: activeList.id,
			[SearchKeys.UseFilterStorage]: false,
		});
	}

	async function deleteListButtonClicked() {
		if (activeList === undefined) return false;
		try {
			let res = await api.deleteList(activeList.id);
			console.log(res);
			showGeneralToast("List deleted");
			deleteSearchParam(SearchKeys.ListId);
			return true;
		} catch (err: any) {
			showErrorToast(err?.message ?? "Failed to delete the list");
			return false;
		}
	}

	return {
		lists: lists ?? EMPTY_ARRAY,
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
