import "./App.css";
import React, { useEffect, useState } from "react";
import { Switch, Route } from "react-router-dom";
import { useSelector } from "react-redux";

import Menu from "./components/Menu";
import ProblemPage from "./components/problem/ProblemPage";
import ContestPage from "./components/contest/ContestPage";
import HomePage from "./components/home/HomePage";
import { PROBLEMS, CONTESTS } from "./util/constants";
import { RootStateType } from "./data/store";
import { ThemesType } from "./util/Theme";

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

    document.title = "CFTracker";
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
        "App container-fluid p-0 min-vh-100 d-flex justify-content-between  flex-column " + state.appState.theme.bgText
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
      <footer className="text-light text-center justify-content-center p-3 w-100 align-self-end">
        All rights reserved by @Bashem
      </footer>
    </div>
  );
}

export default App;
