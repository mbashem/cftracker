import { useAppDispatch, useAppSelector } from "../store";
import Theme, { ThemesType } from "../../util/Theme";
import { useMemo, useState } from "react";
import { changeTheme } from "../reducers/appSlice";

function useTheme() {
	const themeMod = useAppSelector(state => state.appState.themeMod)

	const [theme, setTheme] = useState<Theme>(new Theme());
	useMemo(() => {
		setTheme(new Theme(themeMod))
	}, [themeMod])

	const dispatch = useAppDispatch()

	function changeThemeMod(newThemeMod: ThemesType) {
		dispatch(changeTheme(newThemeMod));
	}

	return {
		theme,
		changeThemeMod
	}
}

export default useTheme;