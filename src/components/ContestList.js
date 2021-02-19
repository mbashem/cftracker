import React, { useEffect, useState } from "react";
import { connect, useSelector } from "react-redux";
import { createProblemUrl, formateDate, charInc } from "../util/bashforces";

const ContestList = () => {
  const state = useSelector((state) => state);

  const [contestList, setContestList] = useState({ contests: [], error: "" });
  const [problemList, setProblemList] = useState({ problems: [], error: "" });

  // 0=> all,1=> unSolved Contest , 2=> attempted Contest
  const ALL = 0,
    UNSOLVED = 1,
    NEVER_ATTEMPTED = 2;
  let contestStat = [new Set(), new Set(), new Set()];

  useEffect(() => {
    setContestList(state.contestList);
    setProblemList(state.problemList);
  }, [state]);

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
        (problemList.problems[mid].contestId == contestId &&
          problemList.problems[mid].index == index)
      ) {
        ans = mid;
        break;
      }

      if (
        problemList.problems[mid].contestId > contestId ||
        (problemList.problems[mid].contestId == contestId &&
          problemList.problems[mid].index > index)
      ) {
        r = mid - 1;
      } else l = mid + 1;
    }
    //console.log(contestId + " " + index + " " + ans);

    if (ans == -1) return <div className=""></div>;

    let solved = state.userSubmissions.solvedProblems.has(contestId + index);
    let attempted = state.userSubmissions.attemptedProblems.has(
      contestId + index
    );

    if (solved) contestStat[1].add(contestId);
    if (attempted || solved) contestStat[2].add(contestId);

    return (
      <div className={solved ? "bg-success" : attempted ? "bg-danger" : ""}>
        <a
          className="text-light text-decoration-none"
          target="_blank"
          href={createProblemUrl(contestId, index)}>
          {problemList.problems[ans].name}
        </a>
      </div>
    );
  };

  const showContest = (index) => {
    const newContestList = state.contestList.contests.filter(
      (contest) => !contestStat[index].has(contest.id)
    );

    setContestList({ ...contestList, contests: newContestList });
  };

  const chooseRandom = (index) => {
    
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
                  onClick={() => showContest(ALL)}
                  href="#">
                  All Contests
                </button>
              </li>
              <li className="nav-item active">
                <button
                  className="btn btn-secondary nav-link m-2"
                  onClick={() => showContest(UNSOLVED)}
                  href="#">
                  Unsolved Contests
                </button>
              </li>
              <li className="nav-item">
                <button
                  className="btn btn-secondary nav-link m-2"
                  onClick={() => showContest(NEVER_ATTEMPTED)}
                  href="#">
                  Never Attempted Contests
                </button>
              </li>
              <li className="nav-item">
                <button className="nav-link" href="#">
                  Choose Random
                </button>
              </li>
              <form className="form-inline d-flex my-2 my-lg-0">
                <input
                  className="form-control mr-sm-2"
                  type="search"
                  placeholder="Search"
                  aria-label="Search"
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
          {contestList.contests.map((contest) => {
            return (
              <tr key={contest.id}>
                <th scope="row">{contest.id}</th>
                <td>
                  <div className="name">{contest.name}</div>
                  <div className="time">
                    {formateDate(contest.startTimeSeconds)}
                  </div>
                </td>
                {[...Array(7)].map((x, i) => {
                  return (
                    <td key={contest.id + charInc("A", i)}>
                      {getInfo(contest.id, charInc("A", i))}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ContestList;
