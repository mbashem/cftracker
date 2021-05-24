import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { charInc, getRandomInteger, parseQuery } from "../../util/bashforces";
import ContestList from "./ContestList";
import { CONTESTS, SEARCH } from "../../util/constants";
import Pagination from "../../util/Pagination";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faRandom, faRedo } from "@fortawesome/free-solid-svg-icons";
import { useHistory } from "react-router";
import { RootStateType } from "../../data/store";
import { changeAppState } from "../../data/actions/fetchActions";
import { AppReducerType } from "../../data/actions/types";
import Contest from "../../util/DataTypes/Contest";
import { ThemesType } from "../../util/Theme";

const ContestPage = () => {
  const state: RootStateType = useSelector((state) => state);

  const history = useHistory();
  const dispatch = useDispatch();

  const [contestList, setContestList] = useState({ contests: [], error: "" });
  const [randomContest, setRandomContest] = useState(-1);
  const [perPage, setPerPage] = useState(100);
  const [showDate, setShowDate] = useState(state.appState.contestPage.showDate);
  const [maxIndex, setMaxIndex] = useState(state.appState.contestPage.maxIndex);

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

  const contestStatus = (contest: Contest) => {
    if (contest.solveCount) return SOLVED;
    if (contest.attempCount) return ATTEMPTED;
    return UNSOLVED;
  };

  const filterContest = (contest) => {
    let solveStatus = filterState.solveStatus.includes(contestStatus(contest));

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
        <nav className="navbar navbar-expand-lg container p-2">
          <div
            className="collapse navbar-collapse d-flex justify-content-between"
            id="navbarTogglerDemo03">
            <ul className="navbar w-100 d-flex justify-content-between list-unstyled">
              <li className="nav-item col-6">
                <form
                  className="form-inline d-flex my-2 my-lg-0"
                  onSubmit={(e) => e.preventDefault()}>
                  <input
                    className={
                      "form-control mr-sm-2 " + state.appState.theme.bgText
                    }
                    type="text"
                    placeholder="Search by Contest Name or Id"
                    name="searchContest"
                    autoComplete="on"
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
                    className={"btn " + state.appState.theme.btn}
                    onClick={chooseRandom}
                    title="Find Random Contest">
                    <FontAwesomeIcon icon={faRandom} />
                  </button>
                  <button
                    type="button"
                    className={"btn " + state.appState.theme.btn}
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
                            className="form-inline d-flex justify-content-between my-2 my-lg-0 pb-3"
                            onSubmit={(e) => e.preventDefault()}>
                            <div className="d-flex justify-content-between w-100">
                              <div className="input-group">
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
                                    changeAppState(
                                      dispatch,
                                      AppReducerType.CHANGE_PER_PAGE,
                                      num,
                                      true
                                    );
                                  }}>
                                  <option value="10">10</option>

                                  <option value="20">20</option>
                                  <option value="50">50</option>
                                  <option value="100">100</option>
                                  <option value={contestList.contests.length}>
                                    All
                                  </option>
                                </select>
                              </div>
                              <div className="input-group">
                                <span className="input-group-text">
                                  Max Index
                                </span>
                                <input
                                  className="form-control "
                                  type="number"
                                  placeholder="Max Index"
                                  value={maxIndex}
                                  name={"maxIndex"}
                                  onChange={(e) => {
                                    let num: number =
                                      parseInt(e.target.value) | 0;
                                    setMaxIndex(num);

                                    if (num != null && num != undefined)
                                      changeAppState(
                                        dispatch,
                                        AppReducerType.CHANGE_MAX_INDEX,
                                        num,
                                        false
                                      );
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
      <div className="ps-4 pt-1 pb-2" style={{ height: "calc(100vh - 230px)" }}>
        <div
          className={
            "overflow-auto h-100 m-0 " +
            (state.appState.themeMod == ThemesType.LIGHT ? " card" : "")
          }>
          <table
            className={
              "table table-bordered m-0 " + state.appState.theme.table
            }>
            <thead className={state.appState.theme.thead}>
              <tr>
                <th
                  scope="col"
                  className="w-sl first-column"
                  style={{ width: "20px" }}>
                  #
                </th>
                <th scope="col" className="w-id" style={{ width: "50px" }}>
                  ID
                </th>
                <th scope="col" className="w-contest">
                  Contest Name
                </th>
                {[...Array(maxIndex)].map((x, i) => {
                  return (
                    <th
                      scope="col"
                      key={"problem-index-" + charInc("A", i)}
                      className="w-problem">
                      {charInc("A", i)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className={state.appState.theme.bg}>
              <ContestList
                contestlist={
                  randomContest === -1
                    ? paginate()
                    : [contestList.contests[randomContest]]
                }
                filterState={filterState}
                showDate={showDate}
                maxIndex={maxIndex}
                perPage={perPage}
                pageSelected={selected}
              />
            </tbody>
          </table>
        </div>
      </div>
      <Pagination
        pageSelected={(e) => setSelected(e)}
        perPage={perPage}
        selected={selected}
        theme={state.appState.theme}
        totalCount={contestList.contests.length}
      />
    </div>
  );
};

export default ContestPage;
