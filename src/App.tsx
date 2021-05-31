import "./App.css";
import { useEffect } from "react";
import { Switch, Route } from "react-router-dom";
import { useSelector } from "react-redux";

import Menu from "./components/Menu";
import ProblemPage from "./components/problem/ProblemPage";
import ContestPage from "./components/contest/ContestPage";
import HomePage from "./components/home/HomePage";
import { PROBLEMS, CONTESTS } from "./util/constants";
import { RootStateType } from "./data/store";
import { ThemesType } from "./util/Theme";
import bootstrap from "bootstrap/dist/js/bootstrap.bundle";

function App() {
  const state: RootStateType = useSelector((state) => state);

  useEffect(() => {
    var tooltipTriggerList = [].slice.call(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    var popoverTriggerList = [].slice.call(
      document.querySelectorAll('[data-bs-toggle="popover"]')
    );
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
      return new bootstrap.Popover(popoverTriggerEl);
    });

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
      <div className="top">
        <div className="menu w-100">
          <Menu />
        </div>

        <Switch>
          <Route exact path="/" component={HomePage} />
          <Route path={PROBLEMS} component={ProblemPage} />
          <Route strict path={CONTESTS} component={ContestPage} />
        </Switch>
      </div>
    </div>
  );
}

export default App;
