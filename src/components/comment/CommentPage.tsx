import { useAppSelector } from "../../data/store";
import { ThemesType } from "../../util/Theme";
import UtterancesComments from "./UtterancesComments";

const CommentPage = () => {
  const themeMod = useAppSelector((state) => state.appState.themeMod);

  return (
    <>
      <UtterancesComments
        repo="mbashem/cftracker"
        issue_term="pathname"
        theme={themeMod === ThemesType.DARK ? "dark-blue" : "github-light"}
        label="CFTracker Comments"
      />
    </>
  );
};

export default CommentPage;
