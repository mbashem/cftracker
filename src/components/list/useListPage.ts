import { useState } from "react";
import useTheme from "../../data/hooks/useTheme";
import useToast from "../../hooks/useToast";
import useList from "../../hooks/useList";

function useListPage() {
	const { theme } = useTheme();
	const [activeList, setActiveList] = useState<string | undefined>();
	const { popGeneralToast, popErrorToast } = useToast();
	const { lists, isAllListLoading, refetchList, errorGettingAllList, createList } = useList();

	function listClicked(listName: string) {
		setActiveList(listName);
	}

	async function createNewList(listName: string) {
		console.log(listName);
		popGeneralToast(`Creating a list with name:${listName}.`);

		try {
			const list = await createList(listName);
			console.log(list);
			refetchList();
		} catch (err: any) {
			console.log(err);
			popErrorToast(err?.message ?? "Failed to create the list!");
			throw err;
		}
	}

	return {
		lists,
		theme,
		listClicked,
		activeList,
		createNewList
	};
}

export default useListPage;