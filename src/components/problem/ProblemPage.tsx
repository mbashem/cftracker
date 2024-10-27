import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSort, faSortDown, faSortUp } from "@fortawesome/free-solid-svg-icons";
import { sortByRating, sortBySolveCount, sortByContestId, SortOrder, SortProblemBy } from "../../util/sortMethods";
import ProblemList from "./ProblemList";
import { useAppSelector } from "../../data/store";
import Problem from "../../types/CF/Problem";
import { Verdict } from "../../types/CF/Submission";
import Filter from "../Common/Filter";
import CustomModal from "../Common/CustomModal";
import CheckList from "../Common/Forms/CheckList";
import Pagination from "../Common/Pagination";
import InputRange from "../Common/Forms/Input/InputRange";
import { StorageService } from "../../util/StorageService";
import useProblemPage from "./useProblemPage";
import Loading from "../Common/Loading";
import { isDefined } from "../../util/util";

// TODO: Convert whole Problem Page to hooks pattern
const ProblemPage = () => {
  const state = useAppSelector((state) => {
    return {
      appState: state.appState,
      problemList: state.problemList,
    };
  });

  const {
    theme,
    submissions,
    listId,
    list,
    searchText,
    setSearchText,
    addProblemToList,
    problemsAddedTolist,
    deleteProblemFromList,
  } = useProblemPage();

  enum SaveProblem {
    SolveStatus = "PROBLEM_SOLVE_STATUS",
    Tags = "PROBLEM_TAGS",
    Filter = "PROBLEM_FILTER",
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
    search: searchText,
  };

  const [filter, setFilter] = useState<filt>(StorageService.getObject(SaveProblem.Filter, defaultFilt));

  const SOLVEBUTTONS = [Verdict.SOLVED, Verdict.ATTEMPTED, Verdict.UNSOLVED];

  const initFilterState = {
    tags: StorageService.getSet(SaveProblem.Tags, Array<string>()),
    sortBy: SortProblemBy.SolveCount,
    order: SortOrder.Descending,
  };

  const [solveStatus, setSolveStatus] = useState(StorageService.getSet(SaveProblem.SolveStatus, SOLVEBUTTONS));
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
    StorageService.saveObject(SaveProblem.Filter, filter);

    setSearchText(filter.search.trim());

    if (isDefined(state.problemList.problems)) {
      let newProblemsList: Problem[] = [];
      newProblemsList = state.problemList.problems;
      newProblemsList = newProblemsList.filter((problem: Problem) => filterProblem(problem));

      if (filterState.sortBy === SortProblemBy.Rating) newProblemsList.sort(sortByRating);
      else if (filterState.sortBy === SortProblemBy.Id) newProblemsList.sort(sortByContestId);
      else newProblemsList.sort(sortBySolveCount);
      if (filterState.order === SortOrder.Descending) newProblemsList.reverse();

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
          order: sortBy === SortProblemBy.Rating ? SortOrder.Ascending : SortOrder.Descending,
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

  const nuetral = useMemo(() => <FontAwesomeIcon icon={faSort} />, []);
  const less = useMemo(() => <FontAwesomeIcon icon={faSortUp} />, []);
  const greater = useMemo(() => <FontAwesomeIcon icon={faSortDown} />, []);

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
                StorageService.saveSet(SaveProblem.SolveStatus, newSet);
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
                StorageService.saveSet(SaveProblem.Tags, newSet);
              }}
              selectAll={true}
              deselectAll={true}
            />
          </CustomModal>
        </Filter>

        <div className={"container p-0 pt-3 pb-3 " + theme.bg}>
          <div className={"h-100 text-center pb-3 " + theme.bg}>
            {state.problemList.loading ? (
              <Loading />
            ) : (
              <table className={"table table-bordered m-0 " + theme.table}>
                <thead className={theme.thead}>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col" role="button" onClick={() => sortList(SortProblemBy.Id)}>
                      <div className="d-flex justify-content-between">
                        <div>ID</div>
                        <div>
                          {filterState.sortBy === SortProblemBy.Id
                            ? filterState.order === SortOrder.Ascending
                              ? less
                              : greater
                            : nuetral}
                        </div>
                      </div>
                    </th>
                    <th scope="col">Name</th>
                    <th scope="col" role="button" onClick={() => sortList(SortProblemBy.Rating)}>
                      <div className="d-flex justify-content-between">
                        <div>Rating</div>
                        <div>
                          {filterState.sortBy === SortProblemBy.Rating
                            ? filterState.order === SortOrder.Ascending
                              ? less
                              : greater
                            : nuetral}
                        </div>
                      </div>
                    </th>
                    <th scope="col" role="button" onClick={() => sortList(SortProblemBy.SolveCount)}>
                      <div className="d-flex justify-content-between">
                        <div>Solve Count</div>
                        <div>
                          {filterState.sortBy === SortProblemBy.SolveCount
                            ? filterState.order === SortOrder.Ascending
                              ? less
                              : greater
                            : nuetral}
                        </div>
                      </div>
                    </th>
                    {isDefined(listId) && <th scope="col">Add To {list?.name}</th>}
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
                    showAddToList={isDefined(listId)}
                    addToList={(id) => addProblemToList(id)}
                    problemsAddedToList={problemsAddedTolist}
                    deleteFromList={deleteProblemFromList}
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
