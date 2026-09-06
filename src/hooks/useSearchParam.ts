import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { SearchKeys } from "../util/constants";

function useAppSearchParams() {
	const [searchParams, setSearchParamsInternal] = useSearchParams();

	const updateSearchParams = useCallback((updates: ReadonlyMap<SearchKeys, string | undefined>) => {
		const updatedSearchParams = new URLSearchParams(searchParams);
		for (const [param, value] of updates) {
			if (value === undefined) updatedSearchParams.delete(param);
			else updatedSearchParams.set(param, value);
		}
		if (updatedSearchParams.toString() === searchParams.toString()) return;
		setSearchParamsInternal(updatedSearchParams, { replace: true });
	}, [searchParams, setSearchParamsInternal]);

	const updateSearchParam = useCallback((param: SearchKeys, value: string) => {
		setSearchParamsInternal((previousSearchParams) => {
			const updatedSearchParams = new URLSearchParams(previousSearchParams);
			updatedSearchParams.set(param, value);
			return updatedSearchParams;
		});
	}, [setSearchParamsInternal]);

	const deleteSearchParam = useCallback((param: SearchKeys) => {
		setSearchParamsInternal((previousSearchParams) => {
			const updatedSearchParams = new URLSearchParams(previousSearchParams);
			updatedSearchParams.delete(param);
			return updatedSearchParams;
		});
	}, [setSearchParamsInternal]);

	const consumeSearchParams = useCallback((params: readonly SearchKeys[]) => {
		setSearchParamsInternal((previousSearchParams) => {
			const updatedSearchParams = new URLSearchParams(previousSearchParams);
			for (const param of params) updatedSearchParams.delete(param);
			return updatedSearchParams;
		}, { replace: true });
	}, [setSearchParamsInternal]);

	return { searchParams, updateSearchParam, updateSearchParams, deleteSearchParam, consumeSearchParams };
}

export default useAppSearchParams;
