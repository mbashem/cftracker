import { useEffect } from "react";
import { fetchContestList, fetchProblemList, fetchSharedProblemList } from "../data/actions/fetchActions";
import { fetchUserSubmissions } from "../data/actions/userActions";
import useTheme from "../data/hooks/useTheme";
import { useAppDispatch, useAppSelector } from "../data/store";
import { ThemesType } from "../util/Theme";
import useCallbackHandler from "./useCallbackHandler";
import usePageTracking from "./usePageTracking";

function useAppBootstrap() {
  const dispatch = useAppDispatch();
  const { theme } = useTheme();
  const handles = useAppSelector((state) => state.userList.handles);
  const isProblemListLoading = useAppSelector((state) => state.problemList.loading);
  const isContestListLoading = useAppSelector((state) => state.contestList.loading);

  usePageTracking();
  useCallbackHandler();

  useEffect(() => {
    fetchProblemList(dispatch);
    fetchContestList(dispatch);
    fetchSharedProblemList(dispatch);
  }, [dispatch]);

  useEffect(() => {
    if (!isContestListLoading && !isProblemListLoading)
      fetchUserSubmissions(dispatch, handles, handles.length > 2 ? true : false);
  }, [dispatch, handles, isContestListLoading, isProblemListLoading]);

  useEffect(() => {
    if (theme.themeType === ThemesType.DARK) {
      document.body.classList.add("bg-dark");
      document.body.classList.remove("bg-light");
    } else {
      document.body.classList.add("bg-light");
      document.body.classList.remove("bg-dark");
    }
  }, [theme.themeType]);
}

export default useAppBootstrap;
