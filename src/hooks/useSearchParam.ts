import { useSearchParams } from "react-router";
import { SearchKeys } from "../util/constants";

function useAppSearchParams() {
	const [searchParams, setSearchParamsInternal] = useSearchParams();

	function updateSearchParam(param: SearchKeys, value: string) {
		searchParams.set(param, value);
		setSearchParamsInternal(searchParams);
	}

	function deleteSearchParam(param: SearchKeys) {
		setSearchParamsInternal((prev) => {
			prev.delete(param);
			return prev;
		});
	}

	return { searchParams, updateSearchParam, deleteSearchParam };
}

export default useAppSearchParams;
