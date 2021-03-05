import "./App.css";
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  fetchContestList,
  fetchProblemList,
  fetchUserSubmissions,
} from "./data/actions/fetchActions";

import Menu, { CONTEST, PROBLEMS } from "./components/Menu";
import ProblemPage from "./components/problem/ProblemPage";
import ContestPage from "./components/contest/ContestPage";

function App(props) {
  const dispatch = useDispatch();

  useEffect(() => {
    // fetchProblemList(dispatch);
    // fetchContestList(dispatch);
  }, []);

  return (
    <div className="App container-fluid bg-dark">
      <div className="menu">
        <Menu />
      </div>

      <Switch>
        <Route path={PROBLEMS} component={ProblemPage} />
        <Route strict path={CONTEST} component={ContestPage}/>

      </Switch>
      <footer className="text-light d-flex justify-content-center p-3">
        All rights reserved by @Bashem
      </footer>
    </div>
  );
}

export default App;
