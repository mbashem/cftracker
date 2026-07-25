import Filter from "../common/Filter";
import Loading from "../common/Loading";
import Pagination from "../common/Pagination";
import ProblemFilterModal from "./ProblemFilterModal";
import ProblemTable from "./problem-list/ProblemTable";
import useProblemPage from "./useProblemPage";

function ProblemPage() {
  const {
    state,
    theme,
    list,
    problemList,
    tagList,
    selected,
    filter,
    filterState,
    ratingRange,
    solveStatus,
    solved,
    attempted,
    currentPageProblems,
    selectableVerdictStatuses,
    showAddToList,
    problemsAddedToList,
    isRandomActive,
    updateFilter,
    setSelected,
    setSolveStatus,
    setTags,
    setRandomProblem,
    sortList,
    addProblemToList,
    deleteProblemFromList,
  } = useProblemPage();

  return (
    <>
      <div>
        <Filter
          search={filter.search}
          searchName="problemSearch"
          searchPlaceHolder="Problem Name or Id"
          name="Problem"
          onSearch={(search) => {
            setSelected(0);
            updateFilter({ search });
          }}
          length={problemList.problems.length}
          perPage={filter.perPage}
          selected={selected}
          setRandom={setRandomProblem}
          theme={theme}
          isRandomActive={isRandomActive}
        >
          <ProblemFilterModal
            theme={theme}
            appState={state.appState}
            filter={filter}
            filterState={filterState}
            ratingRange={ratingRange}
            selectableVerdictStatuses={selectableVerdictStatuses}
            solveStatus={solveStatus}
            tags={tagList.tags}
            updateFilter={updateFilter}
            setSolveStatus={setSolveStatus}
            setTags={setTags}
          />
        </Filter>

        <div className={"container p-0 pt-3 pb-3 " + theme.bg}>
          <div className={"h-100 text-center pb-3 " + theme.bg}>
            {state.problemList.loading ? (
              <Loading />
            ) : (
              <ProblemTable
                problems={currentPageProblems}
                solved={solved}
                attempted={attempted}
                perPage={filter.perPage}
                pageSelected={isRandomActive ? 0 : selected}
                theme={theme}
                filterState={filterState}
                showAddToList={showAddToList}
                list={list}
                addToList={addProblemToList}
                problemsAddedToList={problemsAddedToList}
                deleteFromList={deleteProblemFromList}
                sortList={sortList}
              />
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
          pageSelected={setSelected}
          pageSize={(perPage) => updateFilter({ perPage })}
          isRandomActive={isRandomActive}
          isLoading={state.problemList.loading}
        />
      </footer>
    </>
  );
}

export default ProblemPage;
