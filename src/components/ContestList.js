import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  getProblemUrl,
  formateDate,
  charInc,
  getRandomInteger,
  getContestUrl,
  getLocalStorage,
  setLocalStorage,
} from "../util/bashforces";
import Fuse from "fuse.js";
import { CONTEST_FILTER } from "../util/constants";
import localforage from "localforage";

const ContestList = () => {
  const state = useSelector((state) => state);

  const [contestList, setContestList] = useState({ contests: [], error: "" });
  const [problemList, setProblemList] = useState({ problems: [], error: "" });
  const [randomContest, setRandomContest] = useState(-1);

  // 0=> all,1=> unSolved Contest , 2=> attempted Contest
  const SOLVED = 1,
    ATTEMPTED = 0,
    UNSOLVED = 2;
  let contestStat = [new Set(), new Set(), new Set()];

  const initFilterState = {
    solveStatus: [SOLVED, ATTEMPTED, UNSOLVED],
    search: "",
  };

  // const [filterState, setFilterState] = useState(
  //   getLocalStorage(CONTEST_FILTER) !== null
  //     ? { ...initFilterState, ...getLocalStorage(CONTEST_FILTER) }
  //     : initFilterState
  // );

  const [filterState, setFilterState] = useState(initFilterState);

  const contestStatus = (contest) => {
    if (contestStat[SOLVED].has(contest.id)) return SOLVED;
    if (contestStat[ATTEMPTED].has(contest.id)) return ATTEMPTED;
    return UNSOLVED;
  };

  const filterContest = (contest) => {
    let solveStatus = filterState.solveStatus.includes(contestStatus(contest));
    return solveStatus;
  };

  useEffect(() => {
    let contests = state.contestList.contests;
    //setLocalStorage(CONTEST_FILTER, filterState);
    console.log(filterState);
    if (filterState.search.trim().length !== 0) {
      contests = new Fuse(contests, {
        keys: ["name", "id"],
        ignoreLocation: true,
        threshold: 0.1,
      })
        .search(filterState.search)
        .map((element) => element.item);
    }

    const newContestList = contests.filter((contest) => filterContest(contest));

    setContestList({ ...contestList, contests: newContestList });
    setRandomContest(-1);
    setProblemList(state.problemList);
  }, [state, filterState]);

  const getInfo = (contestId, index) => {
    let l = 0,
      r = problemList.problems.length - 1,
      ans = -1;
    while (l <= r) {
      let mid = l + ((r - l) >> 2);
      if (
        mid >= problemList.problems.length ||
        !("problems" in problemList) ||
        !("contestId" in problemList.problems[mid]) ||
        (problemList.problems[mid].contestId === contestId &&
          problemList.problems[mid].index === index)
      ) {
        ans = mid;
        break;
      }

      if (
        problemList.problems[mid].contestId > contestId ||
        (problemList.problems[mid].contestId === contestId &&
          problemList.problems[mid].index > index)
      ) {
        r = mid - 1;
      } else l = mid + 1;
    }

    const EMPTY = "EMPTY";
    if (ans === -1 && index.length !== 1) return <div className={EMPTY}></div>;

    if (ans === -1 && index.length === 1) {
      let arr = [];
      for (let i = 1; ; i++) {
        let res = getInfo(contestId, index + i);
        if (res.props.className === EMPTY) break;
        arr.push(res);
      }
      return (
        <div className="inside" key={contestId + index}>
          {arr.map((element) => element)}
        </div>
      );
    }

    let solved = state.userSubmissions.solvedProblems.has(contestId + index);
    let attempted = state.userSubmissions.attemptedProblems.has(
      contestId + index
    );

    if (solved) contestStat[SOLVED].add(contestId);
    if (attempted) contestStat[ATTEMPTED].add(contestId);

    let name = problemList.problems[ans].name;
    let id = problemList.problems[ans].id;
    if (name.length > 15) name = name.substring(0, 14) + "...";

    let className = solved ? "bg-success" : attempted ? "bg-danger" : "";
    if (index.length === 1)
      return (
        <td className={className} key={id}>
          <div>
            <a
              className="text-light text-decoration-none"
              target="_blank"
              tabIndex="0"
              data-bs-toggle="tooltip"
              title={problemList.problems[ans].name}
              href={getProblemUrl(contestId, index)}>
              {index + ". "}
              {name}
            </a>
          </div>
        </td>
      );
    return (
      <div>
        <a
          className="text-light text-decoration-none"
          target="_blank"
          tabIndex="0"
          data-bs-toggle="tooltip"
          title={problemList.problems[ans].name}
          href={getProblemUrl(contestId, index)}>
          {index + ". "}
          {name}
        </a>
      </div>
    );
  };

  const showContest = (solveStatus) => {
    setFilterState({ ...filterState, solveStatus });
  };

  const searchData = (e) => {
    e.preventDefault();
    setFilterState({ ...filterState, search: e.target[0].value });
    console.log(contestList);
  };

  const chooseRandom = () => {
    if (contestList.contests.length === 0) return;
    let random = getRandomInteger(0, contestList.contests.length - 1);
    setRandomContest(getRandomInteger(0, contestList.contests.length - 1));
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
              href={getContestUrl(contest.id)}>
              {contest.name}
            </a>
          </div>
          <div className="time">{formateDate(contest.startTimeSeconds)}</div>
        </td>
        {[...Array(7)].map((x, i) => {
          return getInfo(contest.id, charInc("A", i));
        })}
      </tr>
    );
  };

  return (
    <div className="div">
      <div className="menu">
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark p-2">
          <div
            className="collapse navbar-collapse d-flex justify-content-between"
            id="navbarTogglerDemo03">
            <ul className="navbar navbar-dark bg-dark list-unstyled">
              <li className="nav-item">
                <button
                  className="btn btn-secondary nav-link m-2"
                  onClick={() => showContest([SOLVED, ATTEMPTED, UNSOLVED])}
                  href="#">
                  All Contests
                </button>
              </li>
              <li className="nav-item active">
                <button
                  className="btn btn-secondary nav-link m-2"
                  onClick={() => showContest([ATTEMPTED, UNSOLVED])}
                  href="#">
                  Unsolved Contests
                </button>
              </li>
              <li className="nav-item">
                <button
                  className="btn btn-secondary nav-link m-2"
                  onClick={() => showContest([UNSOLVED])}
                  href="#">
                  Never Attempted Contests
                </button>
              </li>
              <li className="nav-item">
                <button className="nav-link" onClick={chooseRandom} href="#">
                  Choose Random
                </button>
              </li>
              <form
                className="form-inline d-flex my-2 my-lg-0"
                onSubmit={searchData}>
                <input
                  className="form-control mr-sm-2"
                  type="text"
                  placeholder="Problem Name or Id"
                  aria-label="Search"
                  input={filterState.search}
                />
              </form>
            </ul>
          </div>
        </nav>
      </div>
      <table className="table table-bordered table-dark">
        <thead className="thead-dark">
          <tr>
            <th scope="col">Contest ID</th>
            <th scope="col">Contest Name</th>
            <th scope="col">A</th>
            <th scope="col">B</th>
            <th scope="col">C</th>
            <th scope="col">D</th>
            <th scope="col">E</th>
            <th scope="col">F</th>
            <th scope="col">G</th>
          </tr>
        </thead>
        <tbody>
          {randomContest === -1
            ? contestList.contests.map((contest) => {
                return contestCard(contest);
              })
            : contestCard(contestList.contests[randomContest])}
        </tbody>
      </table>
    </div>
  );
};

export default ContestList;
