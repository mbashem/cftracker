import useTheme from "../../../data/hooks/useTheme";
import { listApi } from "../../../data/queries/listQuery";

interface Props {
	id: number;
}

function useIndividualListPage({ id }: Props) {
	const { theme } = useTheme();
	const {data: lists, isLoading, error} = listApi.useGetListQuery(id)

	function deleteButtonClicked(problemId: String) {
		
	}

	return {
		id,
		theme,
		lists,
		isLoading,
		error,
		deleteButtonClicked
	};
}

export default useIndividualListPage;
