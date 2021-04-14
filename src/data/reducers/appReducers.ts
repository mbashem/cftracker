import { AppReducerType, ErrorLog } from "../actions/types";

export class AppStateInterfac {
  errorLog: string[];
  successLog: string[];
  darkMode: boolean;
  loaded: boolean;
}

const initAppState: AppStateInterfac = {
  errorLog: [],
  successLog: [],
  darkMode: true,
  loaded: false,
};

export const AppReducer = (
  initState: AppStateInterfac = initAppState,
  action: { type: string; message: string }
) => {
  switch (action.type) {
    case AppReducerType.ADD_ERROR_LOG:
      let newState = { ...initState };
      newState.errorLog.push(action.message);
      return newState;
    case AppReducerType.CLEAR_ERROR_LOG:
      return { ...initState, ErrorLog: new Array<string>() };
    case AppReducerType.TOGGLE_THEME:
      return { ...initState, darkMode: !initState.darkMode };
    case AppReducerType.APP_LOADED:
      return { ...initState, loaded: true };
    default:
      return initState;
  }
};