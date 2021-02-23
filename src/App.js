import "./App.css";
import React, { useEffect, useState } from "react";
import Card from "./components/Card";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  fetchContestList,
  fetchProblemList,
  fetchUserSubmissions,
} from "./data/actions/fetchActions";

import { ProblemList } from "./components/ProblemList";
import Menu, { CONTEST, PROBLEMS } from "./components/Menu";
import ContestList from "./components/ContestList";

function App(props) {
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = "BashForces";
  }, []);
  //console.log(contestList);
  // const props = useSelector(state => state);
  const activateLasers = () => {
    fetchProblemList(dispatch);
    fetchUserSubmissions(dispatch);
    fetchContestList(dispatch);
    //console.log(state);
  };
  console.log(props);

  return (
    <div className="App container-fluid bg-dark">
      <div className="menu">
        <Menu />
      </div>
      <header className="App-header text-light">{}</header>
      <button onClick={activateLasers}>Activate Lasers</button>

      <Switch>
        <Route path={PROBLEMS} component={ProblemList} />
        <Route strict path={CONTEST}>
          <ContestList />
        </Route>
      </Switch>
    </div>
  );
}

export default App;
