import { useEffect, useState } from "react";
import { SearchKeys } from "../../util/constants";
import useSubmissionsStore from "../../data/hooks/useSubmissionsStore";
import useTheme from "../../data/hooks/useTheme";
import useList from "../../data/hooks/useListApi";
import useAppSearchParams from "../../hooks/useSearchParam";
import useProblemsStore from "../../data/hooks/useProblemsStore";
import { useAppSelector } from "../../data/store";

function useProblemPage() {
	const [searchText, setSearchTextInternal] = useState<string>("");
	const { searchParams, updateSearchParam, deleteSearchParam } = useAppSearchParams();
	const [listId, setListId] = useState<number | undefined>();
	const { submissions } = useSubmissionsStore();
	const { theme } = useTheme();
	const { addProblemToList: addProblemToListQuery } = useList();
	const { problemList } = useProblemsStore();
	const appState = useAppSelector((state) => state.appState);

	useEffect(() => {
		let listIdString = searchParams.get(SearchKeys.ListId);
		setListId(listIdString ? parseInt(listIdString) : undefined);
		setSearchTextInternal(searchParams.get(SearchKeys.Search) ?? "");
	}, [searchParams]);

	function setSearchText(text: string) {
		if (text.length === 0)
			deleteSearchParam(SearchKeys.Search);
		else
			updateSearchParam(SearchKeys.Search, text);
	}

	async function addProblemToList(problemId: string) {
		if (listId === undefined) throw new Error("ListId is undefined");
		try {
			let res = await addProblemToListQuery(listId, problemId);
			console.log(res);
			return;
		} catch (err) {
			throw err;
		}
	}

	return { theme, searchText, listId, submissions, setSearchText, addProblemToList, appState, problemList };
}

export default useProblemPage;