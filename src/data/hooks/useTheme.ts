import { useAppDispatch, useAppSelector } from "../store";
import Theme, { ThemesType } from "../../util/Theme";
import { useMemo } from "react";
import { changeTheme } from "../reducers/appSlice";

function useTheme() {
	const themeMod = useAppSelector(state => state.appState.themeMod);

	const theme = useMemo(() => new Theme(themeMod), [themeMod]);

	const dispatch = useAppDispatch();

	function changeThemeMod(newThemeMod: ThemesType) {
		dispatch(changeTheme(newThemeMod));
	}

	return {
		theme,
		changeThemeMod
	};
}

export default useTheme;