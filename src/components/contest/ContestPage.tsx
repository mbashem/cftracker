import { Alert } from "react-bootstrap";
import ContestList from "./ContestList";
import Filter from "../Common/Filter";
import InputChecked from "../Common/Forms/Input/InputChecked";
import CustomModal from "../Common/CustomModal";
import CheckList from "../Common/Forms/CheckList";
import Pagination from "../Common/Pagination";
import Loading from "../Common/Loading";
import useContestPage from "./useContestPage";
import ContestCategorySelection from "./ContestCategorySelection";

function ContestPage() {
  const {
    state,
    theme,
    contestList,
    selected,
    filter,
    solveStatus,
    submissions,
    allParticipantType,
    participant,
    currentPageContests,
    selectableVerdictStatuses,
    categoryFilter,
    updateFilter,
    setSelected,
    setSolveStatus,
    setParticipant,
    setRandomContest,
    setCategories,
    setUpdatedCanSelectMultipleCategories,
  } = useContestPage();

  return (
    <>
      <div>
        <Filter
          search={filter.search}
          searchName="searchContest"
          searchPlaceHolder="Search by Contest Name or Id"
          onSearch={(e) => {
            updateFilter({ search: e });
          }}
          length={contestList.contests.length}
          perPage={filter.perPage}
          selected={selected}
          name="Contest"
          setRandom={(num) => {
            setRandomContest(num);
          }}
          theme={theme}
        >
          <CustomModal title="filter" theme={theme}>
            <div className="group">
              <div className="d-flex flex-column justify-content-between pb-2 w-100">
                <div className="row justify-content-between pt-1">
                  <div className="col-4">
                    <InputChecked
                      header="Date"
                      name="showDate"
                      checked={filter.showDate}
                      title={"Show Date?"}
                      theme={theme}
                      onChange={() => updateFilter({ showDate: !filter.showDate })}
                    />
                  </div>
                  <div className="col-4">
                    <InputChecked
                      header="Rating"
                      name="showRating"
                      checked={filter.showRating}
                      title={"Show Rating?"}
                      theme={theme}
                      onChange={() => updateFilter({ showRating: !filter.showRating })}
                    />
                  </div>
                  <div className="col-4">
                    <InputChecked
                      header="Color"
                      name="showColor"
                      checked={filter.showColor}
                      title={"Show Color?"}
                      theme={theme}
                      onChange={() => {
                        updateFilter({ showColor: !filter.showColor });
                      }}
                    />
                  </div>
                  <div className="col-6 mt-2">
                    <InputChecked
                      header="Short Name"
                      name="showShortName"
                      checked={filter.showShortName}
                      title={"Show Short Name?"}
                      theme={theme}
                      onChange={() => {
                        updateFilter({ showShortName: !filter.showShortName });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <CheckList
              items={selectableVerdictStatuses}
              active={solveStatus}
              name={"Solve Status"}
              onClickSet={setSolveStatus}
            />
            <CheckList
              items={allParticipantType}
              active={participant}
              name={"Participant Type"}
              onClickSet={setParticipant}
            />
          </CustomModal>
        </Filter>
        <div className="pt-3 ps-3" style={{ maxWidth: "800px" }}>
          <ContestCategorySelection
            theme={theme}
            selectedCategories={categoryFilter.selectedCategories}
            canSelectMultipleCategories={categoryFilter.canSelectMultipleCategories}
            setSelectedCategories={setCategories}
            setCanSelectMultipleCategories={setUpdatedCanSelectMultipleCategories}
          />
        </div>
        <div
          className={"ps-3 pe-3 pt-3 pb-3 " + theme.bg}
          // style={{ height: "calc(100vh - 175px)" }}
        >
          <div className={"h-100 m-0 pb-2 " + theme.bg}>
            {state.problemList.loading ? (
              <Loading />
            ) : (
              <>
                {state.problemList.error.length > 0 ? (
                  <Alert key={"danger"} variant={"danger"}>
                    {state.problemList.error} Most probably because CF API is down. Try reloading after few minutes. API
                    link: https://codeforces.com/api/problemset.problems .
                  </Alert>
                ) : (
                  <ContestList
                    contestlist={currentPageContests}
                    submissions={submissions}
                    showCategoryName={filter.selectedCategories.length > 1}
                    shouldShowShortName={filter.showShortName}
                    showColor={filter.showColor}
                    showDate={filter.showDate}
                    showRating={filter.showRating}
                    perPage={filter.perPage}
                    pageSelected={selected}
                    theme={theme}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <footer className={"pt-2 " + theme.bg}>
        <Pagination
          pageSelected={(e) => setSelected(e)}
          perPage={filter.perPage}
          selected={selected}
          theme={theme}
          totalCount={contestList.contests.length}
          pageSize={(e) => updateFilter({ perPage: e })}
        />
      </footer>
    </>
  );
}

export default ContestPage;
