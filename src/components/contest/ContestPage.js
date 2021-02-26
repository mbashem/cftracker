import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  getProblemUrl,
  formateDate,
  charInc,
  getRandomInteger,
  getContestUrl,
} from "../../util/bashforces";
import Fuse from "fuse.js";
import ReactPaginate from "react-paginate";
import ContestList from "./ContestList";
import {
  ATTEMPTED_CONTESTS,
  ATTEMPTED_PROBLEMS,
  SOLVED_CONTESTS,
  SOLVED_PROBLEMS,
} from "../../data/reducers/fetchReducers";
import Pagination from "../Pagination";

const ContestPage = () => {
  const state = useSelector((state) => state);

  const [contestList, setContestList] = useState({ contests: [], error: "" });
  const [randomContest, setRandomContest] = useState(-1);

  const SOLVED = 1,
    ATTEMPTED = 0,
    UNSOLVED = 2;

  const initFilterState = {
    solveStatus: [SOLVED, ATTEMPTED, UNSOLVED],
    search: "",
    showDate: false,
    perPage: 100,
  };

  const [filterState, setFilterState] = useState(initFilterState);
  const [selected, setSelected] = useState(0);
  
  const contestStatus = (contest) => {
    if (state.userSubmissions[SOLVED_CONTESTS].has(contest.id)) return SOLVED;
    if (state.userSubmissions[ATTEMPTED_CONTESTS].has(contest.id))
      return ATTEMPTED;
    return UNSOLVED;
  };

  const filterContest = (contest) => {
    let solveStatus = filterState.solveStatus.includes(contestStatus(contest));
    return solveStatus;
  };

  useEffect(() => {
    let contests = state.contestList.contests;

    if (filterState.search.trim().length !== 0) {
      contests = new Fuse(contests, {
        keys: ["name", "id"],
        ignoreLocation: true,
        threshold: 0.1,
        shouldSort: false,
      })
        .search(filterState.search)
        .map((element) => element.item);
    }

    const newContestList = contests.filter((contest) => filterContest(contest));

    setContestList({ ...contestList, contests: newContestList });
    setRandomContest(-1);
  }, [state, filterState]);

  const showContest = (solveStatus) => {
    setFilterState({ ...filterState, solveStatus });
  };

  const chooseRandom = () => {
    if (contestList.contests.length === 0) return;
    setRandomContest(getRandomInteger(0, contestList.contests.length - 1));
  };

  const paginate = () => {
    let lo = selected * filterState.perPage;
    let high = Math.min(
      contestList.contests.length - 1,
      lo + filterState.perPage - 1
    );

    if (lo > high) return [];
    return contestList.contests.slice(lo, high);
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
                onSubmit={(e) => e.preventDefault()}>
                <input
                  className="form-control mr-sm-2"
                  type="text"
                  placeholder="Problem Name or Id"
                  aria-label="Search"
                  value={filterState.search}
                  onChange={(e) =>
                    setFilterState({ ...filterState, search: e.target.value })
                  }
                />
                <input
                  className="form-control mr-sm-2"
                  type="number"
                  aria-label="Search"
                  value={filterState.perPage}
                  onChange={(e) =>
                    setFilterState({ ...filterState, perPage: e.target.value })
                  }
                />
              </form>
            </ul>
          </div>
        </nav>
      </div>
      {/* <PaginationComponent /> */}

      <Pagination
        pageSelected={(e) => setSelected(e)}
        perPage={filterState.perPage}
        selected={selected}
        totalCount={contestList.contests.length}
      />

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
          <ContestList
            contestlist={
              randomContest === -1
                ? paginate()
                : [contestList.contests[randomContest]]
            }
            filterState={filterState}
          />
        </tbody>
      </table>
    </div>
  );
};

export default ContestPage;
