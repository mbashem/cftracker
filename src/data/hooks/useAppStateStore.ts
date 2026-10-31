import { ThemesType } from "../../util/Theme";
import { changeTheme } from "../reducers/appSlice";
import { useAppDispatch, useAppSelector } from "../store";
import { useCallback } from "react";

function useAppStateStore() {
	const dispatch = useAppDispatch();
	const appState = useAppSelector((state) => state.appState);

	const changeThemeMod = useCallback((themeMod: ThemesType) => {
		dispatch(changeTheme(themeMod));
	}, [dispatch]);

	return { appState, changeThemeMod };
}

export default useAppStateStore;
