import React from "react";
import { useSelector } from "react-redux";
import { getProblemUrl } from "../../util/bashforces";
import { ATTEMPTED_PROBLEMS, SOLVED_PROBLEMS } from "../../util/constants";
import Problem from "../../util/DataTypes/Problem";

interface ProblemListProps {
  problems: Problem[];
}

const ProblemList = ({ problems }: ProblemListProps): JSX.Element => {
  const state = useSelector((state) => state);

  const getState = (problem: Problem) => {
    if (state.userSubmissions[SOLVED_PROBLEMS].has(problem.id))
      return SOLVED_PROBLEMS;
    if (state.userSubmissions[ATTEMPTED_PROBLEMS].has(problem.id))
      return ATTEMPTED_PROBLEMS;
    return "UNSOLVED";
  };

  const ProblemCard = (problem: Problem, index: number) => {
    let classes = "bg-dark";
    let problemState = getState(problem);
    if (problemState === SOLVED_PROBLEMS) classes = "bg-success";
    else if (problemState === ATTEMPTED_PROBLEMS) classes = "bg-danger";
    return (
      <tr key={problem.id}>
        <td className={"id font-weight-bold " + classes}>{index}</td>
        <td className={"id font-weight-bold " + classes}>{problem.id}</td>
        <td className={"name " + classes}>
          <a
            className="text-light text-decoration-none"
            target="_blank"
            title={problem.tags.toString()}
            href={getProblemUrl(problem.contestId, problem.index)}>
            {problem.name}
          </a>
        </td>
        <td className={"rating " + classes}>
          {problem.rating != -1 ? problem.rating : "Not Rated"}
        </td>

        <td className={"solvedCount " + classes}>{problem.solvedCount}</td>
      </tr>
    );
  };

  return (
    <React.Fragment>
      {problems.map((problem: Problem, index: number) => {
        return ProblemCard(problem, index);
      })}
    </React.Fragment>
  );
};

export default ProblemList;
