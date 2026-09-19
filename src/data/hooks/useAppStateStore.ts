import { ThemesType } from "../../util/Theme";
import { changeTheme } from "../reducers/appSlice";
import { useAppDispatch, useAppSelector } from "../store";

function useAppStateStore() {
	const dispatch = useAppDispatch();
	const appState = useAppSelector((state) => state.appState);

	function changeThemeMod(themeMod: ThemesType) {
		dispatch(changeTheme(themeMod));
	}

	return { appState, changeThemeMod };
}

export default useAppStateStore;
