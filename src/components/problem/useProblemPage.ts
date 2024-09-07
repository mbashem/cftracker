import { useEffect, useState } from "react";
import { SearchKeys } from "../../util/constants";
import useSubmissionsStore from "../../data/hooks/useSubmissionsStore";
import useTheme from "../../data/hooks/useTheme";
import useList from "../../data/hooks/useListApi";
import useAppSearchParams from "../../hooks/useSearchParam";
import useProblemsStore from "../../data/hooks/useProblemsStore";
import { useAppSelector } from "../../data/store";
import useToast from "../../hooks/useToast";
import { List } from "../../types/list";

function useProblemPage() {
	const [searchText, setSearchTextInternal] = useState<string>("");
	const { searchParams, updateSearchParam, deleteSearchParam } = useAppSearchParams();
	const [listId, setListId] = useState<number | undefined>(undefined);
	const [list, setList] = useState<List | undefined>(undefined);
	const { submissions } = useSubmissionsStore();
	const { theme } = useTheme();
	const api = useList();
	const { problemList } = useProblemsStore();
	const [problemsAddedTolist, setProblemsAddedToList] = useState<Set<string>>(new Set());
	const appState = useAppSelector((state) => state.appState);
	const { showErrorToast } = useToast();

	useEffect(() => {
		if (listId === undefined) return;

		api.getListWithItems(listId).then(listWithItems => {
			setList(listWithItems);
			setProblemsAddedToList(new Set(listWithItems.items.map(listItem => listItem.problemId)));
		}).catch(err => {
			showErrorToast(err?.message ?? "Failed to find allready added problems");
		});

	}, [listId]);

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
			let res = await api.addProblemToList(listId, problemId);
			console.log(res);
			let newProblemsAddedToList = new Set(problemsAddedTolist);
			newProblemsAddedToList.add(problemId);
			setProblemsAddedToList(newProblemsAddedToList);
			return;
		} catch (err) {
			throw err;
		}
	}

	async function deleteProblemFromList(problemId: string) {
		if (listId === undefined) throw new Error("ListId is undefined");
		try {
			let res = await api.deleteProblemFromList(listId, problemId);
			console.log(res);
			let newProblemsAddedToList = new Set(problemsAddedTolist);
			newProblemsAddedToList.delete(problemId);
			setProblemsAddedToList(newProblemsAddedToList);
			return;
		} catch (err) {
			throw err;
		}
	}

	return { theme, searchText, listId, list, submissions, setSearchText, addProblemToList, appState, problemList, problemsAddedTolist, deleteProblemFromList };
}

export default useProblemPage;