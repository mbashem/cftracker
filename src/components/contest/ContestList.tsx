import React from "react";
import {
  getProblemUrl,
  formateDate,
  charInc,
  getContestUrl,
} from "../../util/bashforces";
import Contest from "../../util/DataTypes/Contest";
import Problem from "../../util/DataTypes/Problem";
import Theme from "../../util/Theme";

interface PropsType {
  contestlist: Contest[];
  filterState: any;
  showDate: boolean;
  maxIndex: number;
  perPage: number;
  pageSelected: number;
  theme: Theme;
}

const ContestList = (props: PropsType) => {

  const renderProblem = (problem: Problem, inside = false) => {
    let solved = problem.solved;
    let attempted = problem.attempted;

    let name = problem.name;
    let id = problem.id;
    // if (name.length > 10) name = name.substring(0, inside ? 9 : 14) + "...";

    let className =
      (solved
        ? props.theme.bgSuccess
        : attempted
        ? props.theme.bgDanger
        : "") + (inside ? " w-50 " : " w-100 ");

    return (
      <div className={className} key={id}>
        <a
          className={
            "text-decoration-none wrap font-bold p-2 " +
            props.theme.text
          }
          target="_blank"
          rel="noreferrer"
          tabIndex={0}
          title={problem.name + ", Rating:" + problem.rating}
          href={getProblemUrl(problem.contestId, problem.index)}>
          {problem.index + ". "}
          {name}
        </a>
      </div>
    );
  };

  const getInfo = (contest: Contest, index) => {
    const EMPTY = "EMPTY " + props.theme.bg;

    let contestId = contest.id;
    let problems = contest.problemList[index];

    if (problems === undefined || problems.length === 0) {
      return (
        <td key={contest.id + index} className={EMPTY + " w-problem"}></td>
      );
    }

    if (problems.length == 1) {
      return (
        <td
          className={
            "p-0 w-problem " +
            (problems[0].solved
              ? props.theme.bgSuccess
              : problems[0].attempted
              ? props.theme.bgDanger
              : "")
          }
          key={contestId + index.charAt(0)}>
          {renderProblem(problems[0], false)}
        </td>
      );
    }

    if (problems.length <= 2) {
      return (
        <td className="p-0 w-problem" key={contestId + index.charAt(0)}>
          <div className="d-flex">
            {problems.map((element) =>
              renderProblem(element, problems.length != 1)
            )}
          </div>
        </td>
      );
    }

    return (
      <td className="inside p-0 w-problem" key={contestId + index}>
        More than 2
      </td>
    );
  };

  const contestCard = (contest: Contest, index) => {
    return (
      <tr key={contest.id}>
        <td scope="row" className="w-sl p-2">
          <div className="d-inline-block">
            {props.pageSelected * props.perPage + index + 1}
          </div>
        </td>
        <td
          scope="row"
          className="w-id p-2 "
          title={
            "Solve Count: " + contest.solveCount + " , Total:" + contest.count
          }>
          <div className="d-inline-block">{contest.id}</div>
        </td>
        <td
          className={
            "p-2 w-contest " +
            (contest.solveCount === contest.count && contest.count !== 0
              ? props.theme.bgSuccess
              : " ")
          }>
          <div className="d-inline-block name">
            <a
              className={
                "text-decoration-none wrap font-bold w-contest p-3 " +
                props.theme.text
              }
              target="_blank"
              rel="noreferrer"
              title={formateDate(contest.startTimeSeconds)}
              href={getContestUrl(contest.id)}>
              {contest.name}
            </a>
          </div>
          {props.showDate ? (
            <div className="time">{formateDate(contest.startTimeSeconds)}</div>
          ) : (
            ""
          )}
        </td>
        {[...Array(props.maxIndex)].map((x, i) => {
          return getInfo(contest, charInc("A", i));
        })}
      </tr>
    );
  };

  return (
    <React.Fragment>
      {props.contestlist.map((contest: Contest, index: number) => {
        return contestCard(contest, index);
      })}
    </React.Fragment>
  );
};

export default ContestList;
