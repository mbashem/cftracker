import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  getRandomInteger,
  parseQuery,
  processNumber,
} from "../../util/bashforces";
import { sortByRating, sortBySolveCount } from "../../util/sortMethods";
import {
  ATTEMPTED_PROBLEMS,
  SOLVED_PROBLEMS,
  SEARCH,
  PROBLEMS,
} from "../../util/constants";
import Pagination from "../../util/Components/Pagination";
import ProblemList from "./ProblemList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilter,
  faRandom,
  faSort,
  faSortDown,
  faSortUp,
  faRedo,
} from "@fortawesome/free-solid-svg-icons";
import { useHistory } from "react-router";
import { RootStateType } from "../../data/store";
import { changeAppState } from "../../data/actions/fetchActions";
import { AppReducerType } from "../../data/actions/types";
import Problem from "../../util/DataTypes/Problem";
import { ThemesType } from "../../util/Theme";
import InputNumber from "../../util/Components/InputNumber";

const ProblemPage = () => {
  const state: RootStateType = useSelector((state) => state) as RootStateType;
  const history = useHistory();
  const dispatch = useDispatch();

  const SOLVED = 1,
    ATTEMPTED = 0,
    UNSOLVED = -1,
    SORT_BY_RATING = 1,
    SORT_BY_SOLVE = 2,
    ASCENDING = 0,
    DESCENDING = 1;

  const query = parseQuery(history.location.search.trim());

  const initFilterState = {
    solveStatus: [SOLVED, ATTEMPTED, UNSOLVED],
    rating: { min_rating: -1, max_rating: 4000 },
    tags: new Set(),
    search: SEARCH in query ? query[SEARCH] : "",
    sortBy: SORT_BY_SOLVE,
    order: DESCENDING,
  };

  const [problemList, setProblemList] = useState({ problems: [], error: "" });
  const [tagList, setTagList] = useState({ tags: [] });
  const [randomProblem, setRandomProblem] = useState(-1);
  const [selected, setSelected] = useState(0);
  const [perPage, setPerPage] = useState(state.appState.problemPage.perPage);
  const [minRating, setMinRating] = useState(
    state.appState.problemPage.minRating
  );
  const [maxRating, setMaxRating] = useState(
    state.appState.problemPage.maxRating
  );
  const [showUnrated, setShowUnrated] = useState(true);

  const [filterState, setFilterState] = useState(initFilterState);

  const filterProblem = (problem) => {
    let containTags = false;

    if (filterState.tags.size === 0) containTags = true;
    else
      for (let tag of problem.tags)
        if (filterState.tags.has(tag)) {
          containTags = true;
          break;
        }
    let ratingInside =
      problem.rating <= maxRating && problem.rating >= minRating;
    // if (problem.rating == -1 && showUnrated == false) ratingInside = false;
    // else if (problem.rating == -1 && showUnrated) ratingInside = true;
    let solveStatus = filterState.solveStatus.includes(getState(problem));

    let searchIncluded = true;
    let text = filterState.search.toLowerCase().trim();
    if (text.length)
      searchIncluded =
        problem.name.toLowerCase().includes(text) ||
        problem.id.toLowerCase().includes(text);

    return solveStatus && ratingInside && containTags && searchIncluded;
  };

  useEffect(() => {
    setPerPage(state.appState.problemPage.perPage);
    setShowUnrated(state.appState.problemPage.showUnrated);

    if (filterState.search.trim().length)
      history.push({
        pathname: PROBLEMS,
        search: "?" + SEARCH + "=" + filterState.search.trim(),
      });
    else
      history.push({
        pathname: PROBLEMS,
      });
    if (state.problemList.problems !== undefined) {
      let newState = { problems: [] };
      newState.problems = state.problemList.problems;

      let used = new Set<string>();

      newState.problems = newState.problems.filter((problem: Problem) => {
        if (used.has(problem.getId())) return false;

        return filterProblem(problem);
      });

      if (filterState.sortBy === SORT_BY_RATING)
        newState.problems.sort(sortByRating);
      else newState.problems.sort(sortBySolveCount);
      if (filterState.order === DESCENDING) newState.problems.reverse();

      let tags = [];
      for (let tag of state.problemList.tags) tags.push(tag);
      setTagList({ tags });
      setProblemList({ ...problemList, problems: newState.problems });
    }
    setRandomProblem(-1);
    setSelected(0);
  }, [state, filterState]);

  const sortList = (sortBy) => {
    if (filterState.sortBy === sortBy)
      setFilterState({ ...filterState, order: filterState.order ^ 1 });
    else
      setFilterState({
        ...filterState,
        ...{
          order: sortBy === SORT_BY_RATING ? ASCENDING : DESCENDING,
          sortBy: sortBy,
        },
      });
  };

  const getState = (problem: Problem) => {
    if (problem.solved) return SOLVED;
    if (problem.attempted) return ATTEMPTED;
    return UNSOLVED;
  };

  const chooseRandom = () => {
    if (problemList.problems.length === 0) return;
    setRandomProblem(getRandomInteger(0, problemList.problems.length - 1));
  };

  const paginate = () => {
    let lo = selected * perPage;
    let high = Math.min(problemList.problems.length, lo + perPage);

    if (lo > high) return [];
    return problemList.problems.slice(lo, high);
  };

  const nuetral = () => {
    return <FontAwesomeIcon icon={faSort} />;
  };

  const less = () => {
    return <FontAwesomeIcon icon={faSortUp} />;
  };

  const greater = () => {
    return <FontAwesomeIcon icon={faSortDown} />;
  };

  return (
    <div>
      <div className="menu">
        <ul className="nav nav-tabs d-flex justify-content-between container border-0 mt-3">
          <li className="nav-item col-4">
            <form
              className="form-inline d-flex my-2 my-lg-0"
              onSubmit={(e) => e.preventDefault()}>
              <input
                className={
                  "form-control mr-sm-2 " + state.appState.theme.bgText
                }
                type="text"
                placeholder="Problem Name or Id"
                aria-label="problemSearch"
                name="problemSearch"
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

          <li className="nav-item text-secondary h-6">
            Showing {paginate().length} of {problemList.problems.length}
          </li>

          <li className="nav-item">
            <div className="btn-group" role="group" aria-label="Basic example">
              <button
                type="button"
                className={"btn " + state.appState.theme.btn}
                onClick={chooseRandom}
                title="Find Random Problem">
                <FontAwesomeIcon icon={faRandom} />
              </button>
              <button
                type="button"
                className={"btn " + state.appState.theme.btn}
                title="Cancel Random"
                onClick={() => setRandomProblem(-1)}>
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
                    <div
                      className="btn-group me-2 d-flex flex-wrap"
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
                            let ind = filterState.solveStatus.indexOf(solved);
                            if (ind !== -1)
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
                    <form
                      className=""
                      onSubmit={(e) => {
                        e.preventDefault();
                      }}>
                      <div className="d-flex">
                        <InputNumber
                          header="Min Rating"
                          min={-1}
                          max={4000}
                          value={minRating}
                          name={"minRating"}
                          onChange={(num) => {
                            setMinRating(num);
                            if (num != null && num != undefined)
                              changeAppState(
                                dispatch,
                                AppReducerType.CHANGE_MIN_RATING,
                                num,
                                false
                              );
                          }}
                        />
                        <InputNumber
                          header="Max Rating"
                          min={-1}
                          max={4000}
                          value={maxRating}
                          name={"maxRating"}
                          onChange={(num) => {
                            setMaxRating(num);
                            if (num != null && num != undefined)
                              changeAppState(
                                dispatch,
                                AppReducerType.CHANGE_MAX_RATING,
                                num,
                                false
                              );
                          }}
                        />
                      </div>
                    </form>
                    <div
                      className="btn-group me-2 d-flex flex-wrap"
                      role="group"
                      aria-label="First group">
                      {tagList.tags.map((tag) => (
                        <button
                          className={
                            (filterState.tags.has(tag)
                              ? "btn bg-success"
                              : "btn bg-dark") + " h-6 m-1 p-1 text-light"
                          }
                          key={tag}
                          onClick={() => {
                            let myFilterState = { ...filterState };
                            if (filterState.tags.has(tag))
                              myFilterState.tags.delete(tag);
                            else myFilterState.tags.add(tag);
                            setFilterState(myFilterState);
                          }}>
                          {tag}
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

      <div
        className={"container p-0 pt-3 pb-3 " + state.appState.theme.bg}
        style={{ height: "calc(100vh - 190px)" }}>
        <div
          className={
            "overflow-auto h-100 text-center " +
            (state.appState.themeMod == ThemesType.LIGHT ? " card" : "")
          }>
          <table
            className={
              "table table-bordered m-0 " + state.appState.theme.table
            }>
            <thead className={state.appState.theme.thead}>
              <tr>
                <th scope="col">#</th>
                <th scope="col">ID</th>
                <th scope="col">Name</th>
                <th
                  scope="col"
                  role="button"
                  onClick={() => sortList(SORT_BY_RATING)}>
                  <div className="d-flex justify-content-between">
                    <div>Rating</div>
                    <div>
                      {filterState.sortBy === SORT_BY_RATING
                        ? filterState.order === ASCENDING
                          ? less()
                          : greater()
                        : nuetral()}
                    </div>
                  </div>
                </th>
                <th
                  scope="col"
                  role="button"
                  onClick={() => sortList(SORT_BY_SOLVE)}>
                  <div className="d-flex justify-content-between">
                    <div>Solve Count</div>
                    <div>
                      {filterState.sortBy === SORT_BY_SOLVE
                        ? filterState.order === ASCENDING
                          ? less()
                          : greater()
                        : nuetral()}
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className={state.appState.theme.bg}>
              <ProblemList
                problems={
                  randomProblem === -1
                    ? paginate()
                    : [problemList.problems[randomProblem]]
                }
                perPage={perPage}
                pageSelected={selected}
                theme={state.appState.theme}
              />
            </tbody>
          </table>
        </div>
      </div>
      <footer>
        <Pagination
          totalCount={problemList.problems.length}
          perPage={perPage}
          selected={selected}
          theme={state.appState.theme}
          pageSelected={(e) => setSelected(e)}
          pageSize={(e) => {
            setPerPage(e);
            changeAppState(dispatch, AppReducerType.CHANGE_PER_PAGE, e, false);
          }}
        />
      </footer>
    </div>
  );
};

export default ProblemPage;
