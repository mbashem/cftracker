import "./App.css";
import { lazy, Suspense, useEffect } from "react";
import { Switch, Route } from "react-router-dom";
import { useSelector } from "react-redux";

import Menu from "./components/Menu";
import { Path } from "./util/constants";
import { RootStateType } from "./data/store";
import { ThemesType } from "./util/Theme";

const HomePage = lazy(() => import("./components/home/HomePage"));
const ProblemPage = lazy(() => import("./components/problem/ProblemPage"));
const ContestPage = lazy(() => import("./components/contest/ContestPage"));
const StatPage = lazy(() => import("./components/stats/StatPage"));

function App() {
  const state: RootStateType = useSelector((state) => state);

  useEffect(() => {
    if (state.appState.themeMod === ThemesType.DARK) {
      document.body.classList.add("bg-dark");
      document.body.classList.remove("bg-light");
    } else {
      document.body.classList.add("bg-light");
      document.body.classList.remove("bg-dark");
    }
  }, []);

  useEffect(() => {
    if (state.appState.themeMod === ThemesType.DARK) {
      document.body.classList.add("bg-dark");
      document.body.classList.remove("bg-light");
    } else {
      document.body.classList.add("bg-light");
      document.body.classList.remove("bg-dark");
    }
  }, [state.appState.themeMod]);

  return (
    <div
      className={
        "App container-fluid p-0 min-vh-100 d-flex  flex-column " +
        state.appState.theme.bgText
      }>
      <div className="menu w-100">
        <Menu />
      </div>
      <div
        className="d-flex flex-column justify-content-between"
        style={{ minHeight: "calc(100vh - 60px)" }}>
        <Suspense
          fallback={
            <div className="d-flex justify-content-center">
              <div className="spinner-border text-secondary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          }>
          <Switch>
            <Route exact path="/" component={HomePage} />
            <Route path={Path.PROBLEMS} component={ProblemPage} />
            <Route strict path={Path.CONTESTS} component={ContestPage} />
            <Route strict path={Path.Stats} component={StatPage} />
          </Switch>
        </Suspense>
      </div>
    </div>
  );
}

export default App;
