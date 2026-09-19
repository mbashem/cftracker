import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { SearchKeys } from "../util/constants";
import { Path } from "../util/route/path";

type SearchParamValue = string | number | boolean | undefined;
export type NavigationSearchParams = Partial<Record<SearchKeys, SearchParamValue>>;

function buildSearchParams(values: NavigationSearchParams) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) searchParams.set(key, String(value));
  }
  return searchParams;
}

function useAppNavigation() {
  const { pathname: pathName } = useLocation();
  const navigate = useNavigate();

  const navigateTo = useCallback((path: Path, searchParams?: NavigationSearchParams) => {
    const search = searchParams === undefined ? undefined : buildSearchParams(searchParams).toString();
    navigate({
      pathname: path,
      search: search === undefined || search.length === 0 ? "" : `?${search}`,
    });
  }, [navigate]);

  return { navigateTo, pathName };
}

export default useAppNavigation;
