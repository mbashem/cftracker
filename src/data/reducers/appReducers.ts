import { ParticipantType } from "../../util/DataTypes/Party";
import Theme, { ThemesType } from "../../util/Theme";
import { AppPayloadType } from "../actions/fetchActions";
import { AppReducerType } from "../actions/types";

export class AppStateType {
  readonly minRating = 0;
  readonly maxRating = 4000;
  readonly minContestId = 1;
  readonly maxContestId = 4000;

  errorLog: string[];
  successLog: string[];
  theme: Theme;
  themeMod: ThemesType;
  loaded: boolean;
  
  constructor() {
    this.errorLog = new Array<string>();
    this.successLog = new Array<string>();
    this.theme = new Theme();
    this.themeMod = ThemesType.LIGHT;

    this.loaded = false;
  }

  init = (data?: any) => {
    if (data.themeMod) {
      this.themeMod = data.themeMod as ThemesType;
      this.theme = new Theme(this.themeMod);
    }
  };

  clone = (): AppStateType => {
    const cloned = new AppStateType();

    cloned.errorLog = this.errorLog;
    cloned.successLog = this.successLog;
    cloned.themeMod = this.themeMod;
    cloned.theme = this.theme;
    cloned.loaded = this.loaded;

    return cloned;
  };
}

const initAppState: AppStateType = new AppStateType();

// dispatch(CHANGE_PER_PAGE,payload: )

export const AppReducer = (
  initState: AppStateType = initAppState,
  action: AppPayloadType
) => {
  let curr = initState.clone();
  switch (action.type) {
    case AppReducerType.CLEAR_ERROR_LOG:
      curr.errorLog = new Array<string>();
      return curr;
    case AppReducerType.CHANGE_THEME:
      curr.themeMod = action.payload.data as ThemesType;
      curr.theme = new Theme(curr.themeMod);
      return curr;
    case AppReducerType.APP_LOADED:
      return { ...initState, loaded: true };
    default:
      return initState;
  }
};
