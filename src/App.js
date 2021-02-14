import "./App.css";
import React, { useEffect, useState } from "react";
import store, { contestList } from "./data/store";
import Card from "./components/Card";
import { connect, useSelector, useDispatch } from "react-redux";
import { mapStateToProps, mapDispatchToProps } from "./data/actions/connectors";
import {
  fetchProblemList,
  fetchUserSubmissions,
} from "./data/actions/fetchActions";

import { ProblemList } from "./components/ProblemList";
import Menu from "./components/Menu";

function App(props) {
  const dispatch = useDispatch();

  const state = useSelector((state) => state);

  useEffect(() => {}, []);
  //console.log(contestList);
  // const props = useSelector(state => state);
  const activateLasers = () => {
    fetchProblemList(dispatch);
    fetchUserSubmissions(dispatch);
    //console.log(state);
  };
  console.log(props);

  return (
    <div className="App container bg-dark">
      <div className="menu">
        <Menu />
      </div>
      {contestList.result.map((element) => {
        return Card(element.id, element.name);
      })}
      <header className="App-header text-light">{}</header>
      <button onClick={activateLasers}>Activate Lasers</button>
      <ProblemList />
    </div>
  );
}

export default App;
