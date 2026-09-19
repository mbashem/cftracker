import Theme from "../../util/Theme";
import { useMemo } from "react";
import useAppStateStore from "./useAppStateStore";

function useTheme() {
	const { appState, changeThemeMod } = useAppStateStore();

	const theme = useMemo(() => new Theme(appState.themeMod), [appState.themeMod]);

	return {
		theme,
		changeThemeMod
	};
}

export default useTheme;
