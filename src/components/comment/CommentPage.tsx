import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootStateType } from "../../data/store";
import { ThemesType } from "../../util/Theme";
import UtterancesComments from "./UtterancesComments";

const ContestPage = () => {
  const state: RootStateType = useSelector((state) => state) as RootStateType;
  // let [theme, set_theme] = useState("dark-blue");

  // useEffect(() => {
  //   if (state.appState.themeMod === ThemesType.DARK) set_theme("dark-blue");
  //   else set_theme("github-light");
  // }, [state.appState.theme]);

  return (
    <>
      <UtterancesComments
        repo="mbashem/cftracker"
        issue_term="pathname"
        theme={
          state.appState.themeMod === ThemesType.DARK
            ? "dark-blue"
            : "github-light"
        }
        label="CFTracker Comments"
      />
    </>
  );
};

export default ContestPage;
