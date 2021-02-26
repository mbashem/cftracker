import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getProblemUrl } from "../../util/bashforces";
import {
  ATTEMPTED_PROBLEMS,
  SOLVED_PROBLEMS,
} from "../../data/reducers/fetchReducers";

const ProblemList = (props) => {
  const state = useSelector((state) => state);

  const getState = (problem) => {
    if (state.userSubmissions[SOLVED_PROBLEMS].has(problem.id))
      return SOLVED_PROBLEMS;
    if (state.userSubmissions[ATTEMPTED_PROBLEMS].has(problem.id))
      return ATTEMPTED_PROBLEMS;
    return "UNSOLVED";
  };

  const ProblemCard = (problem) => {
    let classes = "bg-dark";
    let problemState = getState(problem);
    if (problemState === SOLVED_PROBLEMS) classes = "bg-success";
    else if (problemState === ATTEMPTED_PROBLEMS) classes = "bg-danger";
    return (
      <tr key={problem.id}>
        <td className={"id font-weight-bold " + classes}>{problem.id}</td>
        <td className={"name " + classes}>
          <a
            className="text-light text-decoration-none"
            target="_blank"
            href={getProblemUrl(problem.contestId, problem.index)}>
            {problem.name}
          </a>
        </td>
        <td className={"rating " + classes}>{problem.rating}</td>

        <td className={"solvedCount " + classes}>{problem.solvedCount}</td>
      </tr>
    );
  };

  return (
    <React.Fragment>
      {props.problems.map((problem) => {
        return ProblemCard(problem);
      })}
    </React.Fragment>
  );
};

export default ProblemList;
