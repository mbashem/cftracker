import React from "react";
import { useSelector } from "react-redux";
import { RootStateType } from "../../data/store";
import {
  getProblemUrl,
  formateDate,
  charInc,
  getContestUrl,
} from "../../util/bashforces";
import { ATTEMPTED_PROBLEMS, SOLVED_PROBLEMS } from "../../util/constants";
import Contest from "../../util/DataTypes/Contest";

const ContestList = (props) => {
  const state: RootStateType = useSelector((state) => state);

  const related = state.sharedProblems.problems;

  const getProblem = (contestId, index) => {
    let l = 0,
      r = state.problemList.problems.length - 1;
    while (l <= r) {
      let mid = l + ((r - l) >> 2);
      if (
        state.problemList.problems[mid].contestId === contestId &&
        state.problemList.problems[mid].index === index
      )
        return state.problemList.problems[mid];

      if (
        state.problemList.problems[mid].contestId > contestId ||
        (state.problemList.problems[mid].contestId === contestId &&
          state.problemList.problems[mid].index > index)
      )
        r = mid - 1;
      else l = mid + 1;
    }

    return -1;
  };

  const getStatus = (id: string, solveStatus: string) => {
    let res = state.userSubmissions[solveStatus].has(id);
    return res;
  };

  const renderProblem = (problem) => {
    let solved = getStatus(problem.id, SOLVED_PROBLEMS);
    let attempted = getStatus(problem.id, ATTEMPTED_PROBLEMS);

    let name = problem.name;
    let id = problem.id;
    if (name.length > 10) name = name.substring(0, 9) + "...";

    let className =
      (solved
        ? state.appState.theme.bgSuccess
        : attempted
        ? state.appState.theme.bgDanger
        : "") + " p-1";

    return (
      <td className={className} key={id}>
        <a
          className={
            "text-decoration-none wrap font-bold " + state.appState.theme.text
          }
          target="_blank"
          rel="noreferrer"
          tabIndex={0}
          data-bs-toggle="tooltip"
          title={problem.name + ", Rating:" + problem.rating}
          href={getProblemUrl(problem.contestId, problem.index)}>
          {problem.index + ". "}
          {name}
        </a>
      </td>
    );
  };

  const getSharedIndex = (contestId, index) => {
    let l = 0,
      r = related.length - 1;

    while (l <= r) {
      let mid = l + ((r - l) >> 2);
      if (related[mid].contestId === contestId && related[mid].index === index)
        return mid;
      if (
        related[mid].contestId > contestId ||
        (related[mid].contestId === contestId && related[mid].index > index)
      )
        r = mid - 1;
      else l = mid + 1;
    }

    return -1;
  };

  const getProblemsList = (contestId, index, first = true) => {
    let problem = getProblem(contestId, index);

    let problems = [];
    if (problem === -1) {
      let problem1 = getProblem(contestId, index + "1");
      if (problem1 === -1 && first === true) {
        let sharedIndex = getSharedIndex(contestId, index);
        if (sharedIndex != -1) {
          for (let sharedProblem of related[sharedIndex].shared) {
            let currentGetInfo = getProblemsList(
              sharedProblem.contestId,
              sharedProblem.index,
              false
            );

            if (currentGetInfo.length === 1 && currentGetInfo[0] === -1)
              continue;
            for (let currentProblem of currentGetInfo) {
              let current = { ...currentProblem };
              current.contestId = contestId;
              current.index = current.index.split("");
              current.index[0] = index.charAt(0);
              current.index = current.index.join("");
              current.id = current.contestId.toString() + index;
              problems.push(current);
            }
          }
        }
      } else {
        problems.push(problem1);
        for (let c: number = 2; c <= 3; c++) {
          problem1 = getProblem(contestId, index + c.toString());
          if (problem1 === -1) break;
          problems.push(problem1);
        }
      }
    } else problems.push(problem);

    return problems;
  };

  const getInfo = (contestId, index) => {
    const EMPTY = "EMPTY " + state.appState.theme.bg;

    let problems = getProblemsList(contestId, index);

    if (problems.length === 0) {
      return <td key={contestId + index} className={EMPTY}></td>;
    }

    if (problems.length === 1) {
      return renderProblem(problems[0]);
    }

    if (problems.length === 2) {
      let cnt: number = 0;

      return (
        <td className="p-0" key={contestId + index.charAt(0)}>
          <table>
            <tbody>
              <tr className="inside p-0" key={contestId + index + cnt++}>
                {problems.map((element) => renderProblem(element))}
              </tr>
            </tbody>
          </table>
        </td>
      );
    }

    return (
      <td className="inside p-0" key={contestId + index}>
        More than 4
      </td>
    );
  };

  const contestCard = (contest, index) => {
    return (
      <tr key={contest.id}>
        <th scope="row sticky-col">{index + 1}</th>
        <th scope="row">{contest.id}</th>
        <td>
          <div className="name">
            <a
              className={
                "text-decoration-none wrap font-bold " +
                state.appState.theme.text
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
        {[...Array(10)].map((x, i) => {
          return getInfo(contest.id, charInc("A", i));
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
