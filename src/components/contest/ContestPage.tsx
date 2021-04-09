import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getRandomInteger, parseQuery } from "../../util/bashforces";
import ContestList from "./ContestList";
import {
  ATTEMPTED_CONTESTS,
  CONTESTS,
  SEARCH,
  SOLVED_CONTESTS,
} from "../../util/constants";
import Pagination from "../../util/Pagination";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilter,
  faRandom,
  faRedo,
  faRedoAlt,
} from "@fortawesome/free-solid-svg-icons";
import { useHistory } from "react-router";

const ContestPage = () => {
  const state = useSelector((state) => state);

  const history = useHistory();

  const [contestList, setContestList] = useState({ contests: [], error: "" });
  const [randomContest, setRandomContest] = useState(-1);

  const SOLVED = 1,
    ATTEMPTED = 0,
    UNSOLVED = 2;

  const query = parseQuery(history.location.search.trim());

  const initFilterState = {
    solveStatus: [SOLVED, ATTEMPTED, UNSOLVED],
    search: SEARCH in query ? query[SEARCH] : "",
    showDate: 0,
    perPage: 100,
  };

  const [filterState, setFilterState] = useState(initFilterState);
  const [selected, setSelected] = useState(0);

  const contestStatus = (contestId) => {
    if (state.userSubmissions[SOLVED_CONTESTS].has(contestId)) return SOLVED;
    if (state.userSubmissions[ATTEMPTED_CONTESTS].has(contestId))
      return ATTEMPTED;
    return UNSOLVED;
  };

  const filterContest = (contest) => {
    let solveStatus = filterState.solveStatus.includes(
      contestStatus(contest.id.toString())
    );

    let searchIncluded = true;

    let text = filterState.search.toLowerCase().trim();

    if (text.length)
      searchIncluded =
        contest.name.toLowerCase().includes(text) ||
        contest.id.toString().includes(text);

    return solveStatus && searchIncluded;
  };

  useEffect(() => {
    if (filterState.search.trim().length)
      history.push({
        pathname: CONTESTS,
        search: "?" + SEARCH + "=" + filterState.search.trim(),
      });
    else
      history.push({
        pathname: CONTESTS,
      });
    let contests = state.contestList.contests;

    const newContestList = contests.filter((contest) => filterContest(contest));

    setContestList({ ...contestList, contests: newContestList });
    setRandomContest(-1);
  }, [state, filterState]);

  const chooseRandom = () => {
    if (contestList.contests.length === 0) return;
    setRandomContest(getRandomInteger(0, contestList.contests.length - 1));
  };

  const paginate = () => {
    let lo = selected * filterState.perPage;
    let high = Math.min(contestList.contests.length, lo + filterState.perPage);

    if (lo > high) return [];
    return contestList.contests.slice(lo, high);
  };

  return (
    <div className="div">
      <div className="menu">
        <nav className="navbar navbar-expand-lg navbar-dark container bg-dark p-2">
          <div
            className="collapse navbar-collapse d-flex justify-content-between"
            id="navbarTogglerDemo03">
            <ul className="navbar w-100 navbar-dark d-flex justify-content-between bg-dark list-unstyled">
              <li className="nav-item col-6">
                <form
                  className="form-inline d-flex my-2 my-lg-0"
                  onSubmit={(e) => e.preventDefault()}>
                  <input
                    className="form-control bg-dark text-light mr-sm-2"
                    type="text"
                    placeholder="Search by Contest Name or Id"
                    aria-label="Search"
                    value={filterState.search}
                    onChange={(e) => {
                      setFilterState({
                        ...filterState,
                        search: e.target.value,
                      });
                    }}
                  />
                </form>
              </li>
              <li className="nav-item text-secondary">
                Showing {paginate().length} of {contestList.contests.length}
              </li>
              <li className="nav-item">
                <div
                  className="btn-group"
                  role="group"
                  aria-label="Basic example">
                  <button
                    type="button"
                    className="btn btn-dark nav-link"
                    onClick={chooseRandom}
                    title="Find Random Contest">
                    <FontAwesomeIcon icon={faRandom} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark nav-link"
                    title="Cancel Random"
                    onClick={() => setRandomContest(-1)}>
                    <FontAwesomeIcon icon={faRedo} />
                  </button>
                </div>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className="btn btn-primary"
                  data-bs-toggle="modal"
                  data-bs-target="#exampleModal">
                  {<FontAwesomeIcon icon={faFilter} />}
                </button>
                <div
                  className="modal"
                  id="exampleModal"
                  tabIndex={-1}
                  aria-labelledby="exampleModalLabel"
                  aria-hidden="true">
                  <div className="modal-dialog">
                    <div className="modal-content">
                      <div className="modal-header">
                        <h5 className="modal-title" id="exampleModalLabel">
                          Filter
                        </h5>
                        <button
                          type="button"
                          className="btn-close"
                          data-bs-dismiss="modal"
                          aria-label="Close"></button>
                      </div>
                      <div className="modal-body">
                        <div className="group">
                          <form
                            className="form-inline d-flex justify-content-between my-2 my-lg-0"
                            onSubmit={(e) => e.preventDefault()}>
                            <div className="d-flex justify-content-between w-100">
                              <div className="input-group">
                                <span
                                  className="input-group-text"
                                  id="perpage-input">
                                  Per Page:
                                </span>
                                <input
                                  className="form-control mr-sm-2"
                                  type="number"
                                  aria-label="perpage"
                                  aria-describedby="perpage-input"
                                  value={filterState.perPage}
                                  onChange={(e) => {
                                    setFilterState({
                                      ...filterState,
                                      perPage: parseInt(
                                        e.target.value.toLowerCase().trim()
                                      ),
                                    });
                                  }}
                                />
                              </div>
                              <div className="input-group d-flex justify-content-end">
                                <span
                                  className="input-group-text"
                                  id="perpage-input">
                                  Show Date
                                </span>
                                <div className="input-group-text">
                                  <input
                                    className="form-check-input mt-0"
                                    type="checkbox"
                                    defaultChecked={filterState.showDate == 1}
                                    onChange={() =>
                                      setFilterState({
                                        ...filterState,
                                        showDate: filterState.showDate ^ 1,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                              <button
                                className="btn btn-secondary nav-link m-2 h-6"
                                onClick={() => setFilterState(initFilterState)}
                                title="Reset To Default State">
                                <FontAwesomeIcon icon={faRedoAlt} />
                              </button>
                            </div>
                          </form>
                        </div>
                        <div
                          className="btn-group d-flex flex-wrap justify-content-between"
                          role="group"
                          aria-label="First group">
                          {initFilterState.solveStatus.map((solved) => (
                            <button
                              className={
                                (filterState.solveStatus.includes(solved)
                                  ? "btn bg-success"
                                  : "btn bg-dark") + " h-6 m-1 p-1 text-light"
                              }
                              key={solved}
                              onClick={() => {
                                let myFilterState = { ...filterState };
                                let ind = filterState.solveStatus.indexOf(
                                  solved
                                );
                                if (ind != -1)
                                  myFilterState.solveStatus.splice(ind, 1);
                                else myFilterState.solveStatus.push(solved);
                                setFilterState(myFilterState);
                              }}>
                              {solved === SOLVED
                                ? "Solved"
                                : solved === ATTEMPTED
                                ? "Attempted"
                                : "Unsolved"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
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
            <th scope="col">#</th>
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
      <Pagination
        pageSelected={(e) => setSelected(e)}
        perPage={filterState.perPage}
        selected={selected}
        totalCount={contestList.contests.length}
      />
    </div>
  );
};

export default ContestPage;
