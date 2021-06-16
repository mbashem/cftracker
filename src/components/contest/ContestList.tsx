import React from "react";
import {
  getProblemUrl,
  formateDate,
  charInc,
  getContestUrl,
} from "../../util/bashforces";
import Contest, { ContestCat } from "../../util/DataTypes/Contest";
import Problem from "../../util/DataTypes/Problem";
import { Verdict } from "../../util/DataTypes/Submission";
import Theme from "../../util/Theme";

interface PropsType {
  contestlist: Contest[];
  showDate: boolean;
  minIndex: number;
  maxIndex: number;
  perPage: number;
  pageSelected: number;
  theme: Theme;
  showRating: boolean;
  showColor: boolean;
  category: ContestCat;
  submissions: Map<number, Map<Verdict, Set<string>>>;
}

const ContestList = (props: PropsType) => {
  let short = props.category !== ContestCat.ALL;

  const getStatus = (problem: Problem) => {
    if (!props.submissions.get(problem.contestId)) return Verdict.UNSOLVED;

    if (props.submissions.get(problem.contestId).has(Verdict.SOLVED)) {
      if (
        props.submissions
          .get(problem.contestId)
          .get(Verdict.SOLVED)
          .has(problem.index)
      )
        return Verdict.SOLVED;
    }
    if (props.submissions.get(problem.contestId).has(Verdict.ATTEMPTED)) {
      if (
        props.submissions
          .get(problem.contestId)
          .get(Verdict.ATTEMPTED)
          .has(problem.index)
      )
        return Verdict.ATTEMPTED;
    }
  };

  const renderProblem = (problem: Problem, inside = false) => {
    let solved = false;
    let attempted = false;

    let v = getStatus(problem);
    if (v === Verdict.SOLVED) solved = true;
    if (v === Verdict.ATTEMPTED) attempted = true;

    if (props.submissions.has(problem.contestId)) {
      if (props.submissions.get(problem.contestId).has(Verdict.SOLVED)) {
        if (
          props.submissions
            .get(problem.contestId)
            .get(Verdict.SOLVED)
            .has(problem.index)
        )
          solved = true;
      }
      if (props.submissions.get(problem.contestId).has(Verdict.ATTEMPTED)) {
        if (
          props.submissions
            .get(problem.contestId)
            .get(Verdict.ATTEMPTED)
            .has(problem.index)
        )
          attempted = true;
      }
    }

    let name = problem.name;
    let id = problem.id;
    // if (name.length > 10) name = name.substring(0, inside ? 9 : 14) + "...";

    let className =
      (solved ? props.theme.bgSuccess : attempted ? props.theme.bgDanger : "") +
      (inside ? " w-50 " : " w-100 ");

    return (
      <div className={className + " p-2"} key={id}>
        <a
          className={
            "text-decoration-none wrap font-bold d-inline-block text-truncate " +
            (props.showColor
              ? props.theme.color(problem.rating)
              : props.theme.text)
          }
          target="_blank"
          rel="noreferrer"
          tabIndex={0}
          title={
            problem.name +
            ",Rating:" +
            (problem.rating > 0 ? problem.rating : "Not Rated")
          }
          data-bs-html="true"
          data-bs-toggle="tooltip"
          data-bs-placement="top"
          href={getProblemUrl(problem.contestId, problem.index)}>
          {problem.index + ". "}
          {name}
          {props.showRating ? (
            <span className="fs-6">
              <br />({problem.rating ? problem.rating : "Not Rated"})
            </span>
          ) : (
            ""
          )}
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
        <td key={contest.id + index} className={EMPTY + "w-problem "}></td>
      );
    }

    if (problems.length === 1) {
      let v = getStatus(problems[0]);

      return (
        <td
          className={
            "p-0  " +
            "w-problem " +
            (v === Verdict.SOLVED
              ? props.theme.bgSuccess
              : v === Verdict.ATTEMPTED
              ? props.theme.bgDanger
              : "")
          }
          key={contestId + index.charAt(0) + "1"}>
          {renderProblem(problems[0], false)}
        </td>
      );
    }

    if (problems.length <= 2) {
      return (
        <td className={"p-0 " + "w-problem "} key={contestId + index.charAt(0)}>
          <div className="d-flex">
            {problems.map((element) =>
              renderProblem(element, problems.length !== 1)
            )}
          </div>
        </td>
      );
    }

    return (
      <td className={"inside p-0 " + "w-problem "} key={contestId + index}>
        More than 2
      </td>
    );
  };

  const contestCard = (contest: Contest, index: number) => {
    let solved = false;

    if (
      props.submissions.has(contest.id) &&
      props.submissions.get(contest.id).has(Verdict.SOLVED) &&
      props.submissions.get(contest.id).get(Verdict.SOLVED).size ===
        contest.count
    )
      solved = true;

    return (
      <tr key={contest.id}>
        <td
          scope="row"
          className={
            "w-sl p-2 first-column " + (solved ? props.theme.bgSuccess : " ")
          }>
          <div className="d-inline-block">
            {props.pageSelected * props.perPage + index + 1}
          </div>
        </td>
        {short ? (
          ""
        ) : (
          <td
            scope="row"
            className={
              "w-id p-2 second-column " + (solved ? props.theme.bgSuccess : " ")
            }
            title={
              "Solve Count: " + contest.solveCount + " , Total:" + contest.count
            }>
            <div className="d-inline-block">{contest.id}</div>
          </td>
        )}
        <td
          className={
            "w-contest p-0 " +
            (solved ? props.theme.bgSuccess : " ") +
            (short ? " short" : " ")
          }>
          <div className="d-inline-block name">
            <a
              className={
                "text-decoration-none wrap d-inline-block font-bold pt-2 pb-2 ps-2 pe-1 w-100 " +
                props.theme.text
              }
              target="_blank"
              rel="noreferrer"
              title={contest.name}
              href={getContestUrl(contest.id)}>
              {short ? contest.short : contest.name}
            </a>
          </div>
          {props.showDate ? (
            <div className="time ps-2">
              {formateDate(contest.startTimeSeconds)}
            </div>
          ) : (
            ""
          )}
        </td>
        {[...Array(props.maxIndex - props.minIndex + 1)].map((x, i) => {
          return getInfo(contest, charInc("A", i + props.minIndex - 1));
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
