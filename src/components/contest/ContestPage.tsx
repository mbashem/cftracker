import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { charInc, getRandomInteger, parseQuery } from "../../util/bashforces";
import ContestList from "./ContestList";
import {
  ATTEMPTED_CONTESTS,
  CONTESTS,
  SEARCH,
  SOLVED_CONTESTS,
} from "../../util/constants";
import Pagination from "../../util/Components/Pagination";
import { useHistory } from "react-router";
import { RootStateType } from "../../data/store";
import { changeAppState } from "../../data/actions/fetchActions";
import { AppReducerType } from "../../data/actions/types";
import Contest from "../../util/DataTypes/Contest";
import { ThemesType } from "../../util/Theme";
import InputNumber from "../../util/Components/Forms/InputNumber";
import InputChecked from "../../util/Components/Forms/InputChecked";
import CustomModal from "../../util/Components/CustomModal";
import CheckList from "../../util/Components/Forms/CheckList";
import Filter from "../../util/Components/Filter";

const ContestPage = () => {
  const state: RootStateType = useSelector((state) => state);

  const history = useHistory();
  const dispatch = useDispatch();

  const [contestList, setContestList] = useState({ contests: [], error: "" });
  const [randomContest, setRandomContest] = useState(-1);
  const [perPage, setPerPage] = useState(state.appState.contestPage.perPage);
  const [showDate, setShowDate] = useState(state.appState.contestPage.showDate);
  const [maxIndex, setMaxIndex] = useState(state.appState.contestPage.maxIndex);

  const SOLVED = "SOLVED",
    ATTEMPTED = "ATTEMPED",
    UNSOLVED = "UNSOLVED";

  const query = parseQuery(history.location.search.trim());

  const SOLVEBUTTONS = [SOLVED, ATTEMPTED, UNSOLVED];

  const [selected, setSelected] = useState(0);
  const [solveStatus, setSolveStatus] = useState(new Set<string>(SOLVEBUTTONS));
  const [search, setSearch] = useState(SEARCH in query ? query[SEARCH] : "");
  const [showRating, setShowRating] = useState(
    state.appState.contestPage.showRating
  );
  const [showColor, setShowColor] = useState(
    state.appState.contestPage.showColor
  );

  const contestStatus = (contest: Contest) => {
    if (state.userSubmissions[SOLVED_CONTESTS].has(contest.id)) return SOLVED;
    if (state.userSubmissions[ATTEMPTED_CONTESTS].has(contest.id))
      return ATTEMPTED;
    return UNSOLVED;
  };

  const filterContest = (contest: Contest) => {
    let status = solveStatus.has(contestStatus(contest));

    let searchIncluded = true;

    let text = search.toLowerCase().trim();

    if (text.length)
      searchIncluded =
        contest.name.toLowerCase().includes(text) ||
        contest.id.toString().includes(text);

    return status && searchIncluded && contest.count != 0;
  };

  useEffect(() => {
    setPerPage(state.appState.contestPage.perPage);
    setShowDate(state.appState.contestPage.showDate);
    if (search.trim().length)
      history.push({
        pathname: CONTESTS,
        search: "?" + SEARCH + "=" + search.trim(),
      });
    else
      history.push({
        pathname: CONTESTS,
      });
    let contests = state.contestList.contests;

    const newContestList = contests.filter((contest) => filterContest(contest));

    setContestList({ ...contestList, contests: newContestList });
    setRandomContest(-1);
  }, [state, search, solveStatus]);

  const paginate = () => {
    let lo = selected * perPage;
    let high = Math.min(contestList.contests.length, lo + perPage);

    if (lo > high) return [];
    return contestList.contests.slice(lo, high);
  };

  return (
    <div className="div">
      <Filter
        search={search}
        searchName="searchContest"
        searchPlaceHolder="Search by Contest Name or Id"
        onSearch={(e) => {
          setSearch(e);
        }}
        length={contestList.contests.length}
        perPage={perPage}
        selected={selected}
        name="Contest"
        setRandom={(num) => {
          setRandomContest(num);
        }}
        theme={state.appState.theme}>
        <CustomModal title="filter">
          <div className="group">
            <div className="d-flex flex-column justify-content-between pb-3 w-100">
              <div className="d-flex">
                <InputNumber
                  header="Max Index"
                  min={0}
                  max={26}
                  value={maxIndex}
                  name={"maxIndex"}
                  onChange={(num) => {
                    setMaxIndex(num);

                    if (num !== null && num !== undefined)
                      changeAppState(
                        dispatch,
                        AppReducerType.CHANGE_MAX_INDEX,
                        num,
                        false
                      );
                  }}
                />
              </div>

              <div className="d-flex justify-content-between pt-1">
                <InputChecked
                  header="Show Date"
                  name="showDate"
                  checked={showDate}
                  title={"Show Date?"}
                  onChange={(val) => {
                    setShowDate(!showDate);
                    changeAppState(
                      dispatch,
                      AppReducerType.TOGGLE_DATE,
                      val ? 1 : 0,
                      true
                    );
                  }}
                />
                <InputChecked
                  header="Show Rating"
                  name="showRating"
                  checked={showRating}
                  title={"Show Rating?"}
                  onChange={(val) => {
                    setShowRating(!showRating);
                    changeAppState(
                      dispatch,
                      AppReducerType.TOGGLE_RATING,
                      val ? 1 : 0,
                      true
                    );
                  }}
                />

                <InputChecked
                  header="Show Color"
                  name="showColor"
                  checked={showColor}
                  title={"Show Color?"}
                  onChange={(val) => {
                    setShowColor(!showColor);
                    changeAppState(
                      dispatch,
                      AppReducerType.TOGGLE_COLOR,
                      val ? 1 : 0,
                      true
                    );
                  }}
                />
              </div>
            </div>
          </div>
          <CheckList
            items={SOLVEBUTTONS}
            present={solveStatus}
            onClick={(newSet) => {
              setSolveStatus(newSet);
            }}
          />
        </CustomModal>
      </Filter>
      <div
        className={"p-0 ps-4 pt-3 pb-3 " + state.appState.theme.bg}
        style={{ height: "calc(100vh - 190px)" }}>
        <div
          className={
            "overflow-auto h-100 m-0 " +
            (state.appState.themeMod === ThemesType.LIGHT ? " card" : "")
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
                <th
                  scope="col"
                  className="w-id second-column"
                  style={{ width: "50px" }}>
                  ID
                </th>
                <th scope="col" className="w-contest third-column">
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
                showColor={showColor}
                showDate={showDate}
                maxIndex={maxIndex}
                showRating={showRating}
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
          pageSelected={(e) => setSelected(e)}
          perPage={perPage}
          selected={selected}
          theme={state.appState.theme}
          totalCount={contestList.contests.length}
          pageSize={(e) => {
            setPerPage(e);
            changeAppState(dispatch, AppReducerType.CHANGE_PER_PAGE, e, true);
          }}
        />
      </footer>
    </div>
  );
};

export default ContestPage;
