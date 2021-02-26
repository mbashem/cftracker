import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  getProblemUrl,
  formateDate,
  charInc,
  getContestUrl,
} from "../../util/bashforces";
import {
  ATTEMPTED_CONTESTS,
  ATTEMPTED_PROBLEMS,
  SOLVED_CONTESTS,
  SOLVED_PROBLEMS,
} from "../../data/reducers/fetchReducers";

const ContestList = (props) => {
  const state = useSelector((state) => state);

  const SOLVED = 1,
    ATTEMPTED = 0,
    UNSOLVED = 2;

  const contestStatus = (contest) => {
    if (state.userSubmissions[SOLVED_CONTESTS].has(contest.id)) return SOLVED;
    if (state.userSubmissions[ATTEMPTED_CONTESTS].has(contest.id))
      return ATTEMPTED;
    return UNSOLVED;
  };

  const getInfo = (contestId, index) => {
    let l = 0,
      r = state.problemList.problems.length - 1,
      ans = -1;
    while (l <= r) {
      let mid = l + ((r - l) >> 2);
      if (
        state.problemList.problems[mid].contestId === contestId &&
        state.problemList.problems[mid].index === index
      ) {
        ans = mid;
        break;
      }

      if (
       state. problemList.problems[mid].contestId > contestId ||
        (state.problemList.problems[mid].contestId === contestId &&
          state.problemList.problems[mid].index > index)
      ) {
        r = mid - 1;
      } else l = mid + 1;
    }

    const EMPTY = "EMPTY bg-dark";
    if (ans === -1 && index.length !== 1) return <td className={EMPTY}></td>;

    if (ans === -1 && index.length === 1) {
      let arr = [];
      for (let i = 1; ; i++) {
        let res = getInfo(contestId, index + i);
        if (res.props.className === EMPTY) break;
        arr.push(res);
      }

      if (arr.length < 3)
        return (
          <td className="inside p-0" key={contestId + index}>
            {arr.map((element) => element)}
          </td>
        );
      else
        return (
          <td className="inside p-0" key={contestId + index}>
            More than 4
          </td>
        );
    }

    let solved = state.userSubmissions[SOLVED_PROBLEMS].has(contestId + index);
    let attempted = state.userSubmissions[ATTEMPTED_PROBLEMS].has(
      contestId + index
    );

    let name = state.problemList.problems[ans].name;
    let id = state.problemList.problems[ans].id;
    if (name.length > 15) name = name.substring(0, 14) + "...";

    let className =
      (solved ? "bg-success" : attempted ? "bg-danger" : "") + " p-1";

    return (
      <td className={className} key={id}>
        <a
          className="text-light text-decoration-none"
          target="_blank"
          rel="noreferrer"
          tabIndex="0"
          data-bs-toggle="tooltip"
          title={
            state.problemList.problems[ans].name +
            ", Rating:" +
            state.problemList.problems[ans].rating
          }
          href={getProblemUrl(contestId, index)}>
          {index + ". "}
          {name}
        </a>
      </td>
    );
  };

  const contestCard = (contest) => {
    return (
      <tr key={contest.id}>
        <th scope="row">{contest.id}</th>
        <td>
          <div className="name">
            <a
              className="text-light text-decoration-none"
              target="_blank"
              rel="noreferrer"
              title={formateDate(contest.startTimeSeconds)}
              href={getContestUrl(contest.id)}>
              {contest.name}
            </a>
          </div>
          {props.filterState.showDate ? (
            <div className="time">{formateDate(contest.startTimeSeconds)}</div>
          ) : (
            ""
          )}
        </td>
        {[...Array(7)].map((x, i) => {
          return getInfo(contest.id, charInc("A", i));
        })}
      </tr>
    );
  };

	console.log(props.contestlist);

  return (
    <React.Fragment>
      {props.contestlist.map((contest) => {
        return contestCard(contest);
      })} 
    </React.Fragment>
  );
};

export default ContestList;
