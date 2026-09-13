import { useCallback, useRef } from "react";
import { useSearchParams } from "react-router";
import { SearchKeys } from "../util/constants";

function useAppSearchParams() {
	const [searchParams, setSearchParamsInternal] = useSearchParams();
	const searchParamsValue = searchParams.toString();
	const searchParamsRef = useRef(searchParams);
	searchParamsRef.current = searchParams;

	const getSearchParam = useCallback((param: SearchKeys) => {
		return searchParams.get(param) ?? undefined;
	}, [searchParams]);

	const getSearchParams = useCallback((params: readonly SearchKeys[]) => {
		const values = new Map<SearchKeys, string>();
		for (const param of params) {
			const value = searchParams.get(param);
			if (value !== null) values.set(param, value);
		}
		return values;
	}, [searchParams]);

	const updateSearchParams = useCallback((updates: ReadonlyMap<SearchKeys, string | undefined>) => {
		const updatedSearchParams = new URLSearchParams(searchParamsRef.current);
		for (const [param, value] of updates) {
			if (value === undefined) updatedSearchParams.delete(param);
			else updatedSearchParams.set(param, value);
		}
		if (updatedSearchParams.toString() !== searchParamsRef.current.toString()) {
			searchParamsRef.current = updatedSearchParams;
			setSearchParamsInternal(updatedSearchParams, { replace: true });
		}
		return updatedSearchParams;
	}, [setSearchParamsInternal]);

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

	return {
		searchParams,
		searchParamsValue,
		getSearchParam,
		getSearchParams,
		updateSearchParam,
		updateSearchParams,
		deleteSearchParam,
		consumeSearchParams,
	};
}

export default useAppSearchParams;
