import useProblemsStore from "../../../data/hooks/useProblemsStore";
import useTheme from "../../../data/hooks/useTheme";
import { listApi } from "../../../data/queries/listQuery";

interface Props {
	listId: number;
}

function useIndividualListPage({ listId }: Props) {
	const { theme } = useTheme();
	const { data: lists, isLoading, error, refetch } = listApi.useGetListQuery(listId);
	const [deleteFromList] = listApi.useDeleteFromListMutation();
	const { problemsById } = useProblemsStore();

	async function deleteButtonClicked(problemId: string) {
		try {
			const res = await deleteFromList({ listId, problemId }).unwrap();
			console.log(res);
			refetch();
		} catch (err) {
			console.log(err);
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
