import useListApi from "../../../data/hooks/useListApi";
import useProblemsStore from "../../../data/hooks/useProblemsStore";
import useTheme from "../../../data/hooks/useTheme";

interface Props {
	listId: number;
}

function useIndividualListPage({ listId }: Props) {
	const { theme } = useTheme();
	const api = useListApi();
	const { data: lists, isLoading, error } = api.useGetListQuery(listId);
	const { problemsById } = useProblemsStore();

	async function deleteButtonClicked(problemId: string) {
		try {
			const res = await api.deleteProblemFromList(listId, problemId);
			console.log(res);
			return
		} catch (err) {
			console.log(err);
			throw err;
		}
	}

	return {
		theme,
		lists,
		isLoading,
		error,
		problemsById,
		deleteButtonClicked
	};
}

export default useIndividualListPage;
