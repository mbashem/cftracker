import React, { useEffect, useState } from "react";
import { connect, useSelector } from "react-redux";
import { ProblemCard } from "../util/components/Cards";
import { sortByRating, sortBySolveCount } from "../util/sortMethods";

export function ProblemList() {
  const state = useSelector((state) => state);
  // console.log(state.problemList);
  const [unSolvedProblems, setUnsolvedProblems] = useState({
    problems: [],
    error: "",
  });

  useEffect(() => {
   // console.log(state);
    if (state.problemList.problems != undefined) {
      let newState = { problems: [] };
      for (let problem of state.problemList.problems) {
        let id = problem.contestId.toString() + problem.index;
        if (!state.userSubmissions.solvedProblems.has(id)) {
          newState.problems.push(problem);
        }
      }
      //console.log("NEW State");
      setUnsolvedProblems(newState);
    }
  }, [state]);

 // console.log(unSolvedProblems);

  const sortList = (reverse, rating) => {
    let newUnSolvedProblem = { ...unSolvedProblems };
    //newUnSolvedProblem.problems = [...unSolvedProblems.problems];
    if (rating) newUnSolvedProblem.problems.sort(sortByRating);
    else newUnSolvedProblem.problems.sort(sortBySolveCount);
    if (reverse) newUnSolvedProblem.problems.reverse();
    //console.log(newUnSolvedProblem.problems == unSolvedProblems.problems);
   // console.log(reverse + " " + rating);
    setUnsolvedProblems(newUnSolvedProblem);
   // console.log(unSolvedProblems);
  };

  return (
    <div>
      <div className="menu">
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <a
              className="nav-link active"
              onClick={() => sortList(false, false)}
              href="#">
              Sort By SolvedCount
            </a>
          </li>
          <li className="nav-item">
            <a
              className="nav-link"
              onClick={() => sortList(false, true)}
              href="#">
              Sort By Rating
            </a>
          </li>
        </ul>
      </div>
      <div className="problems">
        {unSolvedProblems.problems.map((problem) => {
          return ProblemCard(problem);
        })}
      </div>
    </div>
  );
}

//export default connect(mapStateToProps, mapDispatchToProps)(ProblemList);
export default ProblemList;
