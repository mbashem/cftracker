import useTheme from "../../data/hooks/useTheme";
import { ThemesType } from "../../util/Theme";
import UtterancesComments from "./UtterancesComments";

function CommentPage() {
  const { theme } = useTheme();

  return (
    <>
      <UtterancesComments
        repo="mbashem/cftracker"
        issue_term="pathname"
        theme={theme.themeType === ThemesType.DARK ? "dark-blue" : "github-light"}
        label="CFTracker Comments"
      />
    </>
  );
}

export default CommentPage;
