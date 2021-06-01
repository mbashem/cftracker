import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { parseQuery } from "../../util/bashforces";
import { sortByRating, sortBySolveCount } from "../../util/sortMethods";
import { SEARCH, PROBLEMS } from "../../util/constants";
import Pagination from "../../util/Components/Pagination";
import ProblemList from "./ProblemList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSort,
  faSortDown,
  faSortUp,
} from "@fortawesome/free-solid-svg-icons";
import { useHistory } from "react-router";
import { RootStateType } from "../../data/store";
import { changeAppState } from "../../data/actions/fetchActions";
import { AppReducerType } from "../../data/actions/types";
import Problem from "../../util/DataTypes/Problem";
import { ThemesType } from "../../util/Theme";
import CustomModal from "../../util/Components/CustomModal";
import CheckList from "../../util/Components/Forms/CheckList";
import Filter from "../../util/Components/Filter";
import InputRange from "../../util/Components/Forms/InputRange";

const ProblemPage = () => {
  const state: RootStateType = useSelector((state) => state) as RootStateType;
  const history = useHistory();
  const dispatch = useDispatch();

  const SORT_BY_RATING = 1,
    SORT_BY_SOLVE = 2,
    ASCENDING = 0,
    DESCENDING = 1;
  const SOLVED = "SOLVED",
    ATTEMPTED = "ATTEMPED",
    UNSOLVED = "UNSOLVED";

  const query = parseQuery(history.location.search.trim());

  const SOLVEBUTTONS = [SOLVED, ATTEMPTED, UNSOLVED];

  const initFilterState = {
    tags: new Set<string>(),
    sortBy: SORT_BY_SOLVE,
    order: DESCENDING,
  };

  const [solveStatus, setSolveStatus] = useState(new Set<string>(SOLVEBUTTONS));
  const [search, setSearch] = useState(SEARCH in query ? query[SEARCH] : "");
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

  const [minContestId, setMinContestId] = useState(
    state.appState.problemPage.minContestId
  );
  const [maxContestId, setMaxContestId] = useState(
    state.appState.problemPage.maxContestId
  );

  const [filterState, setFilterState] = useState(initFilterState);

  const filterProblem = (problem: Problem) => {
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

    let contestIdInside =
      problem.contestId <= maxContestId && problem.contestId >= minContestId;
    let status = solveStatus.has(getState(problem));

    let searchIncluded = true;
    let text = search.toLowerCase().trim();
    if (text.length)
      searchIncluded =
        problem.name.toLowerCase().includes(text) ||
        problem.id.toLowerCase().includes(text);

    return (
      status && ratingInside && containTags && searchIncluded && contestIdInside
    );
  };

  useEffect(() => {
    setPerPage(state.appState.problemPage.perPage);

    if (search.trim().length)
      history.push({
        pathname: PROBLEMS,
        search: "?" + SEARCH + "=" + search.trim(),
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
  }, [state, filterState, search, solveStatus]);

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
      <Filter
        search={search}
        searchName="problemSearch"
        searchPlaceHolder="Problem Name or Id"
        name="Problem"
        onSearch={(e) => {
          setSearch(e);
        }}
        length={problemList.problems.length}
        perPage={perPage}
        selected={selected}
        setRandom={(num) => {
          setRandomProblem(num);
        }}
        theme={state.appState.theme}>
        <CustomModal title="Filter">
          <CheckList
            items={SOLVEBUTTONS}
            present={solveStatus}
            onClick={(newSet) => {
              setSolveStatus(newSet);
            }}
            theme={state.appState.theme}
          />
          <InputRange
            min={state.appState.minRating}
            max={state.appState.maxRating}
            minValue={minRating}
            maxValue={maxRating}
            name="Rating"
            step={100}
            minTitle="Set 0 to show Unrated Problems"
            className="p-2 pb-0"
            onMinChange={(num: number) => {
              setMinRating(num);
              if (num !== null && num !== undefined)
                changeAppState(
                  dispatch,
                  AppReducerType.CHANGE_MIN_RATING,
                  num,
                  false
                );
            }}
            onMaxChange={(num: number) => {
              setMaxRating(num);
              if (num !== null && num !== undefined)
                changeAppState(
                  dispatch,
                  AppReducerType.CHANGE_MAX_RATING,
                  num,
                  false
                );
            }}
          />
          <InputRange
            min={state.appState.minContestId}
            max={state.appState.maxContestId}
            minValue={minContestId}
            maxValue={maxContestId}
            name="ContestId"
            step={1}
            className="p-2"
            onMinChange={(num: number) => {
              setMinContestId(num);
              if (num !== null && num !== undefined)
                changeAppState(
                  dispatch,
                  AppReducerType.CHANGE_MIN_CONTESTID,
                  num,
                  false
                );
            }}
            onMaxChange={(num: number) => {
              setMaxContestId(num);
              if (num !== null && num !== undefined)
                changeAppState(
                  dispatch,
                  AppReducerType.CHANGE_MAX_CONTESTID,
                  num,
                  false
                );
            }}
          />
          <CheckList
            items={tagList.tags}
            present={filterState.tags}
            onClick={(newSet) => {
              let myFilterState = { ...filterState };
              myFilterState.tags = newSet;
              setFilterState(myFilterState);
            }}
          />
        </CustomModal>
      </Filter>

      <div
        className={"container p-0 pt-3 pb-3 " + state.appState.theme.bg}
        style={{ height: "calc(100vh - 175px)" }}>
        <div
          className={
            "overflow-auto h-100 text-center " +
            (state.appState.themeMod === ThemesType.LIGHT ? " card" : "")
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
