import React, { useEffect, useState } from "react";
import { connect, useSelector } from "react-redux";
import { problemCard } from "./Card";
import {
  mapStateToProps,
  mapDispatchToProps,
} from "../data/actions/connectors";
import { unstable_concurrentAct } from "react-dom/test-utils";

export const sortByRating = (a, b) => {
  if (a.rating < b.rating) return -1;
  if (a.rating > b.rating) return 1;
  return 0;
};

export const sortBySolveCount = (a, b) => {
  if (a.solvedCount < b.solvedCount) return -1;
  if (a.solvedCount > b.solvedCount) return 1;
  return 0;
};

export function ProblemList() {
  const state = useSelector((state) => state);
  // console.log(state.problemList);
  const [unSolvedProblems, setUnsolvedProblems] = useState({ problems: [] });

  useEffect(() => {
    console.log(state);
    if (state.problemList.problems != undefined) {
      let newState = { problems: [] };
      for (let problem of state.problemList.problems) {
        let id = problem.contestId.toString() + problem.index;
        if (!state.userSubmissions.solvedProblems.has(id)) {
          newState.problems.push(problem);
        }
      }
      console.log("NEW State");
      setUnsolvedProblems(newState);
    }
  }, [state]);
  console.log(unSolvedProblems);

  const sortList = (reverse, rating) => {
    let newUnSolvedProblem ={...unSolvedProblems};
    //newUnSolvedProblem.problems = [...unSolvedProblems.problems];
    if (rating) newUnSolvedProblem.problems.sort(sortByRating);
    else newUnSolvedProblem.problems.sort(sortBySolveCount);
    if (reverse) newUnSolvedProblem.problems.reverse();
    console.log(newUnSolvedProblem.problems == unSolvedProblems.problems);
    console.log(reverse + " " + rating);
    setUnsolvedProblems(newUnSolvedProblem);
    console.log(unSolvedProblems);
  };

  return (
    <div>
      <div className="menu">
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <a
              className="nav-link active"
              onClick={() => sortList(false, false)}
              href="#"
            >
              Sort By SolvedCount
            </a>
          </li>
          <li className="nav-item">
            <a
              className="nav-link"
              onClick={() => sortList(false, true)}
              href="#"
            >
              Sort By Rating
            </a>
          </li>
        </ul>
      </div>
      <div className="problems">
        {unSolvedProblems.problems.map((problem) => {
          return problemCard(problem);
        })}
      </div>
    </div>
  );
}

//export default connect(mapStateToProps, mapDispatchToProps)(ProblemList);
export default ProblemList;
