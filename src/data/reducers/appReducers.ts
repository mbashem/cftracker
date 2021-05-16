import Theme, { ThemesType } from "../../util/Theme";
import { AppPayloadType } from "../actions/fetchActions";
import { AppReducerType } from "../actions/types";

export class AppStateType {
  errorLog: string[];
  successLog: string[];
  theme: Theme;
  themeMod: ThemesType;
  loaded: boolean;
  contestPage: {
    perPage: number;
    showDate: boolean;
  };
  problemPage: {
    perPage: number;
    minRating: number;
    maxRating: number;
    showUnrated: boolean;
  };

  constructor() {
    this.errorLog = new Array<string>();
    this.successLog = new Array<string>();
    this.theme = new Theme();
    this.themeMod = ThemesType.DARK;

    this.loaded = false;

    this.contestPage = { perPage: 100, showDate: false };
    this.problemPage = {
      perPage: 100,
      minRating: -1,
      maxRating: 4000,
      showUnrated: true,
    };
  }

  init = (data?: any) => {
    if (data.themeMod) {
      this.themeMod = data.themeMod as ThemesType;
      this.theme = new Theme(this.themeMod);
    }

    if (data.contestPage) {
      if (data.contestPage.perPage)
        this.contestPage.perPage = data.contestPage.perPage;
      if (data.contestPage.showDate !== undefined)
        this.contestPage.showDate = data.contestPage.showDate;
    }

    if (data.problemPage) {
      if (data.problemPage.perPage)
        this.problemPage.perPage = data.problemPage.perPage;
      if (data.problemPage.minRating)
        this.problemPage.minRating = data.problemPage.minRating;
      if (data.problemPage.maxRating)
        this.problemPage.maxRating = data.problemPage.maxRating;
      if (data.problemPage.showUnrated !== undefined)
        this.problemPage.showUnrated = data.showUnrated;
    }
  };

  clone = (): AppStateType => {
    const cloned = new AppStateType();

    cloned.errorLog = this.errorLog;
    cloned.successLog = this.successLog;
    cloned.themeMod = this.themeMod;
    cloned.loaded = this.loaded;
    cloned.contestPage = this.contestPage;
    cloned.problemPage = this.problemPage;

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
    case AppReducerType.TOGGLE_DATE:
      curr.contestPage.showDate = !initState.contestPage.showDate;
      return curr;
    case AppReducerType.APP_LOADED:
      return { ...initState, loaded: true };
    case AppReducerType.CHANGE_MAX_RATING:
      curr.problemPage.maxRating = action.payload.data as number;
      return curr;
    case AppReducerType.CHANGE_MIN_RATING:
      curr.problemPage.minRating = action.payload.data as number;
      return curr;
    case AppReducerType.CHANGE_PER_PAGE:
      if (action.payload.isContest)
        curr.contestPage.perPage = action.payload.data as number;
      else curr.problemPage.perPage = action.payload.data as number;
      return curr;
    default:
      return initState;
  }
};
