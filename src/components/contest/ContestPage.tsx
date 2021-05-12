import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { charInc, getRandomInteger, parseQuery } from "../../util/bashforces";
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
import { RootStateType } from "../../data/store";
import { changeAppState } from "../../data/actions/fetchActions";
import { AppReducerType } from "../../data/actions/types";

const ContestPage = () => {
  const state: RootStateType = useSelector((state) => state);

  const history = useHistory();
  const dispatch = useDispatch();

  const [contestList, setContestList] = useState({ contests: [], error: "" });
  const [randomContest, setRandomContest] = useState(-1);
  const [perPage, setPerPage] = useState(100);
  const [showDate, setShowDate] = useState(false);

  const SOLVED = 1,
    ATTEMPTED = 0,
    UNSOLVED = 2;

  const query = parseQuery(history.location.search.trim());

  const initFilterState = {
    solveStatus: [SOLVED, ATTEMPTED, UNSOLVED],
    search: SEARCH in query ? query[SEARCH] : "",
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
      contestStatus(contest.id)
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
    setPerPage(state.appState.contestPage.perPage);
    setShowDate(state.appState.contestPage.showDate);
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
    // let lo = selected * filterState.perPage;
    let lo = selected * perPage;
    let high = Math.min(contestList.contests.length, lo + perPage);

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
                              <div className="input-group mb-3">
                                <div className="input-group-prepend">
                                  <label
                                    className="input-group-text"
                                    htmlFor="inputGroupSelect01">
                                    Per Page
                                  </label>
                                </div>
                                <select
                                  className="custom-select"
                                  id="inputGroupSelect01"
                                  value={perPage}
                                  onChange={(e) => {
                                    let num: number = parseInt(e.target.value);

                                    // setFilterState({
                                    //   ...filterState,
                                    //   perPage: num,
                                    // });
                                    changeAppState(
                                      dispatch,
                                      AppReducerType.CHANGE_PER_PAGE,
                                      num,
                                      true
                                    );
                                  }}>
                                  <option value="20">20</option>
                                  <option value="50">50</option>
                                  <option value="100">100</option>
                                  <option value={contestList.contests.length}>
                                    All
                                  </option>
                                </select>
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
                                    defaultChecked={showDate}
                                    onChange={() =>
                                      changeAppState(
                                        dispatch,
                                        AppReducerType.TOGGLE_DATE,
                                        +!!!showDate,
                                        true
                                      )
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
                                let ind =
                                  filterState.solveStatus.indexOf(solved);
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
        perPage={perPage}
        selected={selected}
        totalCount={contestList.contests.length}
      />
      <div className="table-responsive">
        <table className="table table-bordered table-dark overflow-auto">
          <thead className="thead-dark">
            <tr>
              <th scope="col" className="sticky-col">
                #
              </th>
              <th scope="col">ID</th>
              <th scope="col">Contest Name</th>
              {[...Array(10)].map((x, i) => {
                return <th scope="col">{charInc("A", i)}</th>;
              })}
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
          perPage={perPage}
          selected={selected}
          totalCount={contestList.contests.length}
        />
      </div>
    </div>
  );
};

export default ContestPage;
