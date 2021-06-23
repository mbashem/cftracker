import React from "react";
import { getProblemUrl } from "../../util/bashforces";
import { ATTEMPTED_PROBLEMS, SOLVED_PROBLEMS } from "../../util/constants";
import Problem from "../../util/DataTypes/Problem";
import Theme from "../../util/Theme";

interface ProblemListProps {
  problems: Problem[];
  perPage: number;
  pageSelected: number;
  theme: Theme;
  solved: Set<string>;
  attempted: Set<string>;
}

const ProblemList = (props: ProblemListProps): JSX.Element => {
  const getState = (problem: Problem) => {
    if (props.solved.has(problem.getId())) return SOLVED_PROBLEMS;
    if (props.attempted.has(problem.getId())) return ATTEMPTED_PROBLEMS;
    return "UNSOLVED";
  };

  const ProblemCard = (problem: Problem, index: number) => {
    let classes = props.theme.bg;
    let problemState = getState(problem);
    if (problemState === SOLVED_PROBLEMS) classes = props.theme.bgSuccess;
    else if (problemState === ATTEMPTED_PROBLEMS)
      classes = props.theme.bgDanger;
    return (
      <tr key={problem.id}>
        <td className={"id font-weight-bold p-2 " + classes}>
          {props.pageSelected * props.perPage + index + 1}
        </td>
        <td className={"id font-weight-bold " + classes}>
          <a
            className={"text-decoration-none p-2 " + " " + props.theme.text}
            target="_blank"
            rel="noreferrer"
            href={getProblemUrl(problem.contestId, problem.index)}>
            {problem.id}
          </a>
        </td>
        <td className={"name " + classes}>
          <a
            className={"text-decoration-none p-2 " + " " + props.theme.text}
            target="_blank"
            rel="noreferrer"
            title={problem.tags.toString()}
            href={getProblemUrl(problem.contestId, problem.index)}>
            {problem.name}
          </a>
        </td>
        <td className={"rating p-2 " + classes}>
          {problem.rating > 0 ? problem.rating : "Not Rated(0)"}
        </td>

        <td className={"solvedCount p-2 " + classes}>{problem.solvedCount}</td>
      </tr>
    );
  };

  return (
    <React.Fragment>
      {props.problems.map((problem: Problem, index: number) => {
        return ProblemCard(problem, index);
      })}
    </React.Fragment>
  );
};

export default ProblemList;
