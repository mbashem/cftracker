import "./App.css";
import React, { useEffect } from "react";
import {  Switch, Route } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchContestList,
  fetchProblemList,
  fetchSharedProblemList,
} from "./data/actions/fetchActions";

import {
  fetchUserSubmissions
} from "./data/actions/userActions";

import Menu from "./components/Menu";
import ProblemPage from "./components/problem/ProblemPage";
import ContestPage from "./components/contest/ContestPage";
import HomePage from "./components/home/HomePage";
import { PROBLEMS, CONTESTS } from "./util/constants";

function App(props) {
  const dispatch = useDispatch();
  const state = useSelector(state=>state);

  useEffect(() => {
    fetchProblemList(dispatch);
    fetchUserSubmissions(dispatch, state.userList.handles);
    fetchContestList(dispatch);
    fetchSharedProblemList(dispatch);
    document.body.classList.add("bg-dark");
    document.title = "BashForces";
  }, []);

  return (
    <div className="App container-fluid bg-dark min-vh-100 d-flex justify-content-between  flex-column">
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
