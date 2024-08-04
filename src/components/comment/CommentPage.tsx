import { useAppSelector } from "../../data/store";
import { ThemesType } from "../../util/Theme";
import UtterancesComments from "./UtterancesComments";

const ContestPage = () => {
  const themeMod = useAppSelector((state) => state.appState.themeMod);
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
        theme={themeMod === ThemesType.DARK ? "dark-blue" : "github-light"}
        label="CFTracker Comments"
      />
    </>
  );
};

export default ContestPage;
