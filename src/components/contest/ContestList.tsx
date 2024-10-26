import React from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { getProblemUrl, formateDate, charInc, getContestUrl } from "../../util/util";
import Contest from "../../types/CF/Contest";
import Problem from "../../types/CF/Problem";
import { Verdict } from "../../types/CF/Submission";
import Theme, { ThemesType } from "../../util/Theme";

interface PropsType {
  contestlist: Contest[];
  showDate: boolean;
  perPage: number;
  pageSelected: number;
  theme: Theme;
  showRating: boolean;
  showColor: boolean;
  shouldShowShortName: boolean;
  showCategoryName: boolean;
  submissions: Map<number, Map<Verdict, Set<string>>>;
}

// TODO: Refactor, split into multiple components
const ContestList = (props: PropsType) => {
  let mxInd: number = 0;

  for (let contest of props.contestlist) {
    if (contest.mxInd > mxInd) {
      mxInd = contest.mxInd;
    }
  }
  interface indInt {
    minIndex: number;
    maxIndex: number;
  }

  let ind: indInt = {
    minIndex: 1,
    maxIndex: mxInd,
  };

  // console.log(ind.minIndex);
  // console.log(ind.maxIndex);

  const getStatus = (problem: Problem) => {
    if (problem.contestId === undefined || !props.submissions.get(problem.contestId)) return Verdict.UNSOLVED;

    if (props.submissions.get(problem.contestId)!.has(Verdict.SOLVED)) {
      if (props.submissions.get(problem.contestId)!.get(Verdict.SOLVED)!.has(problem.index)) return Verdict.SOLVED;
    }
    if (props.submissions.get(problem.contestId)!.has(Verdict.ATTEMPTED)) {
      if (props.submissions.get(problem.contestId)!.get(Verdict.ATTEMPTED)!.has(problem.index))
        return Verdict.ATTEMPTED;
    }
  };

  const renderProblem = (problem: Problem, inside = 0, len = 0) => {
    if (problem.contestId === undefined) return;
    let solved = false;
    let attempted = false;

    let v = getStatus(problem);
    if (v === Verdict.SOLVED) solved = true;
    if (v === Verdict.ATTEMPTED) attempted = true;

    if (props.submissions.has(problem.contestId)) {
      if (props.submissions.get(problem.contestId)!.has(Verdict.SOLVED)) {
        if (props.submissions.get(problem.contestId)!.get(Verdict.SOLVED)!.has(problem.index)) solved = true;
      }
      if (props.submissions.get(problem.contestId)!.has(Verdict.ATTEMPTED)) {
        if (props.submissions.get(problem.contestId)!.get(Verdict.ATTEMPTED)!.has(problem.index)) attempted = true;
      }
    }

    let name = problem.name;
    let id = problem.id;

    let className =
      (solved ? props.theme.bgSuccess : attempted ? props.theme.bgDanger : "") +
      (inside ? (len == 3 ? " w-100 pb-3 ps-1 pe-0 " : " w-50 ") : " w-100 ");

    return (
      <div
        className={
          className +
          " p-2 " +
          (inside !== len && inside !== 0
            ? " pe-0 border-end" + (props.theme.themeType === ThemesType.DARK ? " border-dark" : "")
            : "")
        }
        key={id}
      >
        <a
          className={
            (len !== 3 ? "text-truncate " : "") +
            "text-decoration-none wrap font-bold d-inline-block  " +
            (props.showColor ? props.theme.color(problem.rating ?? 0) : props.theme.text)
          }
          target="_blank"
          rel="noreferrer"
          tabIndex={0}
          title={problem.name + ",Rating:" + (problem.rating ?? 0 > 0 ? problem.rating : "Not Rated")}
          data-bs-html="true"
          data-bs-toggle="tooltip"
          data-bs-placement="top"
          href={getProblemUrl(problem.contestId!, problem.index)}
        >
          <span>
            {problem.index}
            {len == 3 ? "" : ". " + name}
          </span>
          {props.showRating ? (
            <span className="fs-6">
              <br />
              {len == 3 ? "" : "("}
              {problem.rating ? problem.rating : "N/A"}
              {len == 3 ? "" : ")"}
            </span>
          ) : (
            ""
          )}
        </a>
        {/* </OverlayTrigger> */}
      </div>
    );
  };

  const getInfo = (contest: Contest, index: string) => {
    const EMPTY = "EMPTY " + props.theme.bg;

    let contestId = contest.id;
    let problems = contest.problemList[index];

    if (problems === undefined || problems.length === 0) {
      return <td key={contest.id + index} className={EMPTY + "w-problem "}></td>;
    }

    if (problems.length === 1) {
      let v = getStatus(problems[0]);

      return (
        <td
          className={
            "p-0  " +
            "w-problem " +
            (v === Verdict.SOLVED ? props.theme.bgSuccess : v === Verdict.ATTEMPTED ? props.theme.bgDanger : "")
          }
          key={contestId + index.charAt(0) + "1"}
        >
          {renderProblem(problems[0])}
        </td>
      );
    }

    if (problems.length <= 3) {
      return (
        <td className={"p-0 " + "w-problem "} key={contestId + index.charAt(0)}>
          <div className="d-flex">
            {problems.map((element, index) =>
              renderProblem(element, problems.length === 0 ? 0 : index + 1, problems.length)
            )}
          </div>
        </td>
      );
    }

    return (
      <td className={"inside p-0 " + "w-problem "} key={contestId + index}>
        More than 3
      </td>
    );
  };

  const contestCard = (contest: Contest, index: number) => {
    let solved = false;
    const shouldShowCategoryName =
      props.showCategoryName && props.shouldShowShortName && contest.isShortAvailable && contest.isCFRound;

    if (
      props.submissions.has(contest.id) &&
      props.submissions.get(contest.id)!.has(Verdict.SOLVED) &&
      props.submissions.get(contest.id)!.get(Verdict.SOLVED)!.size === contest.count
    )
      solved = true;

    return (
      <tr key={contest.id}>
        <td scope="row" className={"w-sl p-2 first-column " + (solved ? props.theme.bgSuccess : " ")}>
          <div className="d-inline-block">{props.pageSelected * props.perPage + index + 1}</div>
        </td>
        {/* {short ? (
          ""
        ) : (
          <td
            scope="row"
            className={
              "w-id p-2 second-column " + (solved ? props.theme.bgSuccess : " ")
            }
            title={
              "Solve Count: " + contest.solveCount + " , Total:" + contest.count
            }
          >
            <div className="d-inline-block">{contest.id}</div>
          </td>
        )} */}
        <td
          className={
            "w-contest p-0 h-100 position-relative " +
            (solved ? props.theme.bgSuccess : " ") +
            (props.shouldShowShortName ? " short" : " ")
          }
        >
          {shouldShowCategoryName && (
            // <h6>
            // <sup>
            //   <span className="badge rounded-pill bg-light text-dark">{contest.category}</span>
            // </sup>
            // </h6>
            <span className="position-absolute ms-2 top-0 start-0 badge rounded-pill bg-light text-dark">
              {contest.category}
              <span className="visually-hidden">unread messages</span>
            </span>
          )}
          <div className="d-inline-block w-100 name">
            <OverlayTrigger
              placement={"top"}
              key={`contest-name-${contest.id.toString()}`}
              overlay={
                <Tooltip id={`contest-name-${contest.id.toString()}`}>
                  <p className="text-center text-wrap pe-1" style={{ width: "150px" }}>
                    {contest.name}
                  </p>
                  <p>ID: {contest.id}</p>
                </Tooltip>
              }
            >
              <a
                className={
                  "text-decoration-none wrap d-inline-block pt-2 pb-2 ps-2 pe-1 mw-100 " +
                  props.theme.text +
                  (props.shouldShowShortName ? " text-truncate" : " ")
                }
                target="_blank"
                rel="noreferrer"
                //title={contest.name}
                href={getContestUrl(contest.id)}
              >
                <span>{props.shouldShowShortName ? contest.short : contest.name}</span>
              </a>
            </OverlayTrigger>
          </div>
          {props.showDate ? <div className="time ps-2">{formateDate(contest.startTimeSeconds ?? 0)}</div> : ""}
        </td>
        {[...Array(ind.maxIndex - ind.minIndex + 1)].map((x, i) => {
          return getInfo(contest, charInc("A", i));
        })}
      </tr>
    );
  };

  return (
    <React.Fragment>
      <table className={"table table-bordered m-0 " + props.theme.table}>
        <thead className={props.theme.thead}>
          <tr>
            <th scope="col" className="w-sl first-column" style={{ width: "20px" }}>
              #
            </th>
            <th scope="col" className={"w-contest third-column" + (props.shouldShowShortName ? " short" : "")}>
              Contest
            </th>
            {[...Array(ind.maxIndex - ind.minIndex + 1)].map((_x, i) => {
              return (
                <th scope="col" key={"problem-index-" + charInc("A", i)} className={"w-problem"}>
                  {charInc("A", i)}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className={props.theme.bg}>
          {props.contestlist.map((contest: Contest, index: number) => {
            return contestCard(contest, index);
          })}
        </tbody>
      </table>
    </React.Fragment>
  );
};

export default ContestList;
