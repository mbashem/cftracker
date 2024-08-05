import { useEffect, useState } from "react";
import { sortByRating, sortBySolveCount } from "../../util/sortMethods";
import { SEARCH } from "../../util/constants";
import ProblemList from "./ProblemList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSort, faSortDown, faSortUp } from "@fortawesome/free-solid-svg-icons";
import { useAppSelector } from "../../data/store";
import Problem from "../../types/Problem";
import { getObj, getSet, saveObj, saveSet } from "../../util/save";
import { Verdict } from "../../types/Submission";
import { ThreeDots } from "react-loader-spinner";
import { useSearchParams } from "react-router-dom";
import useSubmissionsStore from "../../data/hooks/useSubmissionsStore";
import useTheme from "../../data/hooks/useTheme";
import Filter from "../Common/Filter";
import CustomModal from "../Common/CustomModal";
import CheckList from "../Common/Forms/CheckList";
import Pagination from "../Common/Pagination";
import InputRange from "../Common/Forms/InputRange";

const ProblemPage = () => {
  const state = useAppSelector((state) => {
    return {
      appState: state.appState,
      problemList: state.problemList,
    };
  });
  const { theme } = useTheme();

  const [searchParams, setSearchParams] = useSearchParams();
  const { submissions } = useSubmissionsStore();

  const SORT_BY_RATING = 1,
    SORT_BY_SOLVE = 2,
    ASCENDING = 0,
    DESCENDING = 1;

  enum ProblemSave {
    PROBLEM_SOLVE_STATUS = "PROBLEM_SOLVE_STATUS",
    PROBLEM_TAGS = "PROBLEM_TAGS",
    PROBLEM_FILTER = "PROBLEM_FILTER",
  }

  interface filt {
    perPage: number;
    minRating: number;
    maxRating: number;
    showUnrated: boolean;
    minContestId: number;
    maxContestId: number;
    search: string;
  }

  const defaultFilt: filt = {
    perPage: 100,
    minRating: state.appState.minRating,
    maxRating: state.appState.maxRating,
    showUnrated: true,
    minContestId: state.appState.minContestId,
    maxContestId: state.appState.maxContestId,
    search: searchParams.get(SEARCH) ?? "",
  };

  const [filter, setFilter] = useState<filt>(getObj(ProblemSave.PROBLEM_FILTER, defaultFilt));

  const SOLVEBUTTONS = [Verdict.SOLVED, Verdict.ATTEMPTED, Verdict.UNSOLVED];

  const initFilterState = {
    tags: getSet(ProblemSave.PROBLEM_TAGS, []),
    sortBy: SORT_BY_SOLVE,
    order: DESCENDING,
  };

  const [solveStatus, setSolveStatus] = useState(getSet(ProblemSave.PROBLEM_SOLVE_STATUS, SOLVEBUTTONS));
  const [problemList, setProblemList] = useState<{
    problems: Problem[];
    error: string;
  }>({
    problems: [],
    error: "",
  });
  const [tagList, setTagList] = useState({ tags: Array<string>() });
  const [randomProblem, setRandomProblem] = useState(-1);
  const [selected, setSelected] = useState(0);

  const [filterState, setFilterState] = useState(initFilterState);
  const [solved, setSolved] = useState(new Set<string>());
  const [attempted, setAttempted] = useState(new Set<string>());

  const filterProblem = (problem: Problem) => {
    let containTags = false;

    if (filterState.tags.size === 0) containTags = true;
    else
      for (let tag of problem.tags)
        if (filterState.tags.has(tag)) {
          containTags = true;
          break;
        }
    let ratingInside = problem.rating <= filter.maxRating && problem.rating >= filter.minRating;

    let contestIdInside = problem.contestId <= filter.maxContestId && problem.contestId >= filter.minContestId;
    let status = solveStatus.has(getState(problem));

    let searchIncluded = true;
    let text = filter.search.toLowerCase().trim();
    if (text.length)
      searchIncluded = problem.name.toLowerCase().includes(text) || problem.id.toLowerCase().includes(text);

    return status && ratingInside && containTags && searchIncluded && contestIdInside;
  };

  const getState = (problem: Problem) => {
    if (solved.has(problem.id)) return Verdict.SOLVED;
    if (attempted.has(problem.id)) return Verdict.ATTEMPTED;
    return Verdict.UNSOLVED;
  };

  useEffect(() => {
    saveObj(ProblemSave.PROBLEM_FILTER, filter);

    if (filter.search.trim().length) setSearchParams({ [SEARCH]: filter.search.trim() });
    else setSearchParams();
    if (state.problemList.problems !== undefined) {
      let newProblemsList: Problem[] = [];
      newProblemsList = state.problemList.problems;
      newProblemsList = newProblemsList.filter((problem: Problem) => filterProblem(problem));

      if (filterState.sortBy === SORT_BY_RATING) newProblemsList.sort(sortByRating);
      else newProblemsList.sort(sortBySolveCount);
      if (filterState.order === DESCENDING) newProblemsList.reverse();

      let tags = [];
      for (let tag of state.problemList.tags) tags.push(tag);
      setTagList({ tags });
      setProblemList({ ...problemList, problems: newProblemsList });
    }
    setRandomProblem(-1);
    setSelected(0);
  }, [
    state.problemList.problems,
    state.problemList.tags,
    filterState,
    filter,
    filter.search,
    solveStatus,
    solved,
    attempted,
  ]);

  useEffect(() => {
    let solv = new Set<string>();
    let att = new Set<string>();

    for (let submission of submissions) {
      if (submission.verdict === Verdict.OK) solv.add(submission.contestId.toString() + submission.index);
      else att.add(submission.contestId.toString() + submission.index);
    }

    setSolved(solv);
    setAttempted(att);
  }, [submissions]);

  // TOOD: Convert to enum
  const sortList = (sortBy: number) => {
    if (filterState.sortBy === sortBy) setFilterState({ ...filterState, order: filterState.order ^ 1 });
    else
      setFilterState({
        ...filterState,
        ...{
          order: sortBy === SORT_BY_RATING ? ASCENDING : DESCENDING,
          sortBy: sortBy,
        },
      });
  };

  const paginate = () => {
    let lo = selected * filter.perPage;
    let high = Math.min(problemList.problems.length, lo + filter.perPage);

    if (lo > high) return [];
    return problemList.problems.slice(lo, high);
  };

  const nuetral = <FontAwesomeIcon icon={faSort} />;

  const less = <FontAwesomeIcon icon={faSortUp} />;

  const greater = <FontAwesomeIcon icon={faSortDown} />;

  return (
    <>
      <div>
        <Filter
          search={filter.search}
          searchName="problemSearch"
          searchPlaceHolder="Problem Name or Id"
          name="Problem"
          onSearch={(e) => {
            setFilter({ ...filter, search: e });
          }}
          length={problemList.problems.length}
          perPage={filter.perPage}
          selected={selected}
          setRandom={(num) => {
            setRandomProblem(num);
          }}
          theme={theme}
        >
          <CustomModal title="Filter" theme={theme}>
            <CheckList
              items={SOLVEBUTTONS}
              active={solveStatus}
              name={"Solve Status"}
              onClickSet={(newSet) => {
                setSolveStatus(newSet);
                saveSet(ProblemSave.PROBLEM_SOLVE_STATUS, newSet);
              }}
              theme={theme}
            />
            <InputRange
              min={state.appState.minRating}
              max={state.appState.maxRating}
              minValue={filter.minRating}
              maxValue={filter.maxRating}
              theme={theme}
              name="Rating"
              step={100}
              minTitle="Set 0 to show Unrated Problems"
              className="p-2 pb-0"
              onMinChange={(num: number) => {
                setFilter({ ...filter, minRating: num });
              }}
              onMaxChange={(num: number) => {
                setFilter({ ...filter, maxRating: num });
              }}
            />
            <InputRange
              min={state.appState.minContestId}
              max={state.appState.maxContestId}
              minValue={filter.minContestId}
              maxValue={filter.maxContestId}
              theme={theme}
              name="ContestId"
              step={1}
              className="p-2"
              onMinChange={(num: number) => {
                setFilter({ ...filter, minContestId: num });
              }}
              onMaxChange={(num: number) => {
                setFilter({ ...filter, maxContestId: num });
              }}
            />
            <CheckList
              items={tagList.tags}
              active={filterState.tags}
              name={"Tags"}
              onClickSet={(newSet) => {
                let myFilterState = { ...filterState };
                myFilterState.tags = newSet;
                setFilterState(myFilterState);
                saveSet(ProblemSave.PROBLEM_TAGS, newSet);
              }}
              selectAll={true}
              deselectAll={true}
            />
          </CustomModal>
        </Filter>

        <div className={"container p-0 pt-3 pb-3 " + theme.bg}>
          <div className={"h-100 text-center pb-3 " + theme.bg}>
            {state.problemList.loading ? (
              <ThreeDots
                height="80"
                width="80"
                radius="8"
                color="grey"
                wrapperClass={"d-flex justify-content-center"}
                ariaLabel="three-dots-loading"
                visible={true}
              />
            ) : (
              <table className={"table table-bordered m-0 " + theme.table}>
                <thead className={theme.thead}>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">ID</th>
                    <th scope="col">Name</th>
                    <th scope="col" role="button" onClick={() => sortList(SORT_BY_RATING)}>
                      <div className="d-flex justify-content-between">
                        <div>Rating</div>
                        <div>
                          {filterState.sortBy === SORT_BY_RATING
                            ? filterState.order === ASCENDING
                              ? less
                              : greater
                            : nuetral}
                        </div>
                      </div>
                    </th>
                    <th scope="col" role="button" onClick={() => sortList(SORT_BY_SOLVE)}>
                      <div className="d-flex justify-content-between">
                        <div>Solve Count</div>
                        <div>
                          {filterState.sortBy === SORT_BY_SOLVE
                            ? filterState.order === ASCENDING
                              ? less
                              : greater
                            : nuetral}
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className={theme.bg}>
                  <ProblemList
                    problems={randomProblem === -1 ? paginate() : [problemList.problems[randomProblem]]}
                    solved={solved}
                    attempted={attempted}
                    perPage={filter.perPage}
                    pageSelected={selected}
                    theme={theme}
                  />
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <footer className={"pt-2 " + theme.bg}>
        <Pagination
          totalCount={problemList.problems.length}
          perPage={filter.perPage}
          selected={selected}
          theme={theme}
          pageSelected={(e) => setSelected(e)}
          pageSize={(num) => {
            setFilter({ ...filter, perPage: num });
          }}
        />
      </footer>
    </>
  );
};

export default ProblemPage;
