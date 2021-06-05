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
  contestPage: {
    perPage: number;
    showDate: boolean;
    maxIndex: number;
    showRating: boolean;
    showColor: boolean;
    query: string;
  };
  problemPage: {
    perPage: number;
    minRating: number;
    maxRating: number;
    showUnrated: boolean;
    minContestId: number;
    maxContestId: number;
    query: string;
  };
  // submissions: {
  //   participantType: string[];
  // };

  constructor() {
    this.errorLog = new Array<string>();
    this.successLog = new Array<string>();
    this.theme = new Theme();
    this.themeMod = ThemesType.LIGHT;

    this.loaded = false;

    // this.submissions = {
    //   participantType: new Array<string>(Object.keys(ParticipantType)),
    // };

    this.contestPage = {
      perPage: 20,
      showDate: false,
      maxIndex: 8,
      showRating: false,
      showColor: true,
      query: "",
    };
    this.problemPage = {
      perPage: 20,
      minRating: this.minRating,
      maxRating: this.maxRating,
      showUnrated: true,
      minContestId: this.minContestId,
      maxContestId: this.maxContestId,
      query: "",
    };
  }

  init = (data?: any) => {
    if (data.themeMod) {
      this.themeMod = data.themeMod as ThemesType;
      this.theme = new Theme(this.themeMod);
    }

    if ("contestPage" in data) {
      this.contestPage = { ...this.contestPage, ...data.contestPage };
    }

    if ("problemPage" in data) {
      this.problemPage = { ...this.problemPage, ...data.problemPage };
    }

    // if ("submissions" in data && "participantType" in data.submissions) {
    //   this.submissions.participantType = new Array<string>(
    //     data.submissions.participantType
    //   );
    // }
  };

  clone = (): AppStateType => {
    const cloned = new AppStateType();

    cloned.errorLog = this.errorLog;
    cloned.successLog = this.successLog;
    cloned.themeMod = this.themeMod;
    cloned.theme = this.theme;
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
    case AppReducerType.TOGGLE_RATING:
      curr.contestPage.showRating = !initState.contestPage.showRating;
      return curr;
    case AppReducerType.TOGGLE_COLOR:
      curr.contestPage.showColor = !initState.contestPage.showColor;
      return curr;
    case AppReducerType.APP_LOADED:
      return { ...initState, loaded: true };
    case AppReducerType.CHANGE_MAX_RATING:
      curr.problemPage.maxRating = action.payload.data as number;
      return curr;
    case AppReducerType.CHANGE_MIN_RATING:
      curr.problemPage.minRating = action.payload.data as number;
      return curr;
    case AppReducerType.CHANGE_MIN_CONTESTID:
      curr.problemPage.minContestId = action.payload.data as number;
      return curr;
    case AppReducerType.CHANGE_MAX_CONTESTID:
      curr.problemPage.maxContestId = action.payload.data as number;
      return curr;
    case AppReducerType.CHANGE_PER_PAGE:
      if (action.payload.isContest)
        curr.contestPage.perPage = action.payload.data as number;
      else curr.problemPage.perPage = action.payload.data as number;
      return curr;
    case AppReducerType.CHANGE_QUERY:
      if (action.payload.isContest)
        curr.contestPage.query = action.payload.data as string;
      else curr.problemPage.query = action.payload.data as string;
      return curr;
    case AppReducerType.CHANGE_MAX_INDEX:
      curr.contestPage.maxIndex = action.payload.data as number;
      return curr;
    default:
      return initState;
  }
};
