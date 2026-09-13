import { useCallback } from "react";
import { useNavigate } from "react-router";
import { Path } from "../util/route/path";

function useAppNavigation() {
  const navigate = useNavigate();

  const navigateTo = useCallback((path: Path, searchParams?: URLSearchParams) => {
    const search = searchParams?.toString();
    navigate({
      pathname: path,
      search: search === undefined || search.length === 0 ? "" : `?${search}`,
    });
  }, [navigate]);

  return { navigateTo };
}

export default useAppNavigation;
