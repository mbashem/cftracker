import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { charInc, parseQuery, stringToArray } from "../../util/bashforces";
import ContestList from "./ContestList";
import { Path, SEARCH } from "../../util/constants";
import Pagination from "../../util/Components/Pagination";
import { useHistory } from "react-router";
import { RootStateType } from "../../data/store";
import Contest, { ContestCat } from "../../util/DataTypes/Contest";
import InputChecked from "../../util/Components/Forms/InputChecked";
import CustomModal from "../../util/Components/CustomModal";
import CheckList from "../../util/Components/Forms/CheckList";
import Filter from "../../util/Components/Filter";
import InputRange from "../../util/Components/Forms/InputRange";
import { getObj, getSet, saveObj, saveSet } from "../../util/save";
import { Verdict } from "../../util/DataTypes/Submission";
import { ParticipantType } from "../../util/DataTypes/Party";

const ContestPage = () => {
  const state: RootStateType = useSelector((state) => state);

  const history = useHistory();

  const query = parseQuery(history.location.search.trim());

  const [contestList, setContestList] = useState({ contests: [], error: "" });
  const [randomContest, setRandomContest] = useState(-1);

  interface filt {
    perPage: number;
    showDate: boolean;
    maxIndex: number;
    minIndex: number;
    showRating: boolean;
    showColor: boolean;
    search: string;
    category: ContestCat;
  }

  const defaultFilt: filt = {
    perPage: 20,
    showDate: false,
    maxIndex: 8,
    minIndex: 1,
    showRating: false,
    showColor: true,
    category: ContestCat.DIV2,
    search: SEARCH in query ? query[SEARCH] : "",
  };

  enum ContestSave {
    CONTEST_SOLVE_STATUS = "CONTEST_SOLVE_STATUS",
    PARTICIPANT_TYPE = "PARTICIPANT_TYPE",
    CONTEST_FILTER = "CONTEST_FILTER",
  }

  const [filter, setFilter] = useState<filt>(
    getObj(ContestSave.CONTEST_FILTER, defaultFilt)
  );

  const SOLVEBUTTONS = [Verdict.SOLVED, Verdict.ATTEMPTED, Verdict.UNSOLVED];

  const PARTICIPANTSTYPE = Object.keys(ParticipantType);

  const [selected, setSelected] = useState(0);
  const [solveStatus, setSolveStatus] = useState(
    getSet(ContestSave.CONTEST_SOLVE_STATUS, SOLVEBUTTONS)
  );
  const [participant, setParticipant] = useState(
    getSet(ContestSave.PARTICIPANT_TYPE, PARTICIPANTSTYPE)
  );

  const [submissions, setSubmissions] = useState<
    Map<number, Map<Verdict, Set<string>>>
  >(new Map());

  const contestStatus = (contest: Contest) => {
    if (!submissions.has(contest.id)) return Verdict.UNSOLVED;
    if (submissions.get(contest.id).has(Verdict.SOLVED)) return Verdict.SOLVED;
    return Verdict.ATTEMPTED;
  };

  const filterContest = (contest: Contest) => {
    let status = solveStatus.has(contestStatus(contest));

    let searchIncluded = true;

    let text = filter.search.toLowerCase().trim();

    if (text.length)
      searchIncluded =
        contest.name.toLowerCase().includes(text) ||
        contest.id.toString().includes(text);

    let catIn = false;

    if (
      filter.category === ContestCat.ALL ||
      filter.category === contest.category
    )
      catIn = true;

    return status && searchIncluded && contest.count !== 0 && catIn;
  };

  useEffect(() => {
    saveObj(ContestSave.CONTEST_FILTER, filter);
    if (filter.search.trim().length)
      history.push({
        pathname: Path.CONTESTS,
        search: "?" + SEARCH + "=" + filter.search.trim(),
      });
    else
      history.push({
        pathname: Path.CONTESTS,
      });
    let contests = state.contestList.contests;

    const newContestList = contests.filter((contest) => filterContest(contest));

    setContestList({ ...contestList, contests: newContestList });
    setRandomContest(-1);
  }, [state, filter, solveStatus]);

  useEffect(() => {
    let currRec: Map<number, Map<Verdict, Set<string>>> = new Map();
    for (let sub of state.userSubmissions.submissions) {
      if (!participant.has(sub.author.participantType)) continue;
      let ver = sub.verdict === Verdict.OK ? Verdict.SOLVED : Verdict.ATTEMPTED;
      if (!currRec.has(sub.contestId))
        currRec.set(sub.contestId, new Map<Verdict, Set<string>>());
      if (!currRec.get(sub.contestId).has(ver))
        currRec.get(sub.contestId).set(ver, new Set());
      currRec.get(sub.contestId).get(ver).add(sub.index);
    }
    setSubmissions(currRec);
  }, [state.userSubmissions.submissions, participant]);

  const paginate = () => {
    let lo = selected * filter.perPage;
    let high = Math.min(contestList.contests.length, lo + filter.perPage);

    if (lo > high) return [];
    return contestList.contests.slice(lo, high);
  };

  return (
    <>
      <div>
        <Filter
          search={filter.search}
          searchName="searchContest"
          searchPlaceHolder="Search by Contest Name or Id"
          onSearch={(e) => {
            setFilter({ ...filter, search: e });
          }}
          length={contestList.contests.length}
          perPage={filter.perPage}
          selected={selected}
          name="Contest"
          setRandom={(num) => {
            setRandomContest(num);
          }}
          theme={state.appState.theme}>
          <CustomModal title="filter" theme={state.appState.theme}>
            <div className="group">
              <div className="d-flex flex-column justify-content-between pb-2 w-100">
                <div className="d-flex justify-content-between pt-1">
                  <InputChecked
                    header="Show Date"
                    name="showDate"
                    checked={filter.showDate}
                    title={"Show Date?"}
                    onChange={(val) => {
                      setFilter({ ...filter, showDate: !filter.showDate });
                    }}
                  />
                  <InputChecked
                    header="Show Rating"
                    name="showRating"
                    checked={filter.showRating}
                    title={"Show Rating?"}
                    onChange={(val) => {
                      setFilter({ ...filter, showRating: !filter.showRating });
                    }}
                  />

                  <InputChecked
                    header="Show Color"
                    name="showColor"
                    checked={filter.showColor}
                    title={"Show Color?"}
                    onChange={(val) => {
                      setFilter({ ...filter, showColor: !filter.showColor });
                    }}
                  />
                </div>
                <div className="pt-2">
                  <InputRange
                    name="Index"
                    min={1}
                    max={26}
                    step={1}
                    minValue={filter.minIndex}
                    maxValue={filter.maxIndex}
                    onMaxChange={(num) => {
                      setFilter({ ...filter, maxIndex: num });
                    }}
                    onMinChange={(num) => {
                      setFilter({ ...filter, minIndex: num });
                    }}
                  />
                </div>
              </div>
            </div>
            <CheckList
              items={SOLVEBUTTONS}
              active={solveStatus}
              name={"Solve Status"}
              onClickSet={(newSet) => {
                setSolveStatus(newSet);
                saveSet(ContestSave.CONTEST_SOLVE_STATUS, newSet);
              }}
            />
            <CheckList
              items={PARTICIPANTSTYPE}
              active={participant}
              name={"Participant Type"}
              onClickSet={(newSet) => {
                setParticipant(newSet);
                saveSet(ContestSave.PARTICIPANT_TYPE, newSet);
              }}
            />
          </CustomModal>
        </Filter>
        <div className="pt-2 ps-3" style={{ width: "800px" }}>
          <CheckList
            items={Object.values(ContestCat)}
            active={new Set([filter.category])}
            name={""}
            onClick={(str) => {
              setFilter({ ...filter, category: str as ContestCat });
            }}
            activeClass="btn-secondary active"
            inactiveClass="btn-secondary"
            btnClass="p-1 btn"
          />
        </div>
        <div
          className={"ps-3 pe-3 pt-3 pb-3 " + state.appState.theme.bg}
          // style={{ height: "calc(100vh - 175px)" }}
        >
          <div className={"h-100 m-0 pb-2 " + state.appState.theme.bg}>
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
                  {filter.category !== ContestCat.ALL ? "" : 
                  (
                  <th
                    scope="col"
                    className="w-id second-column"
                    style={{ width: "50px" }}>
                    ID
                  </th>
                  )
                  }
                  <th
                    scope="col"
                    className={
                      "w-contest third-column" +
                      (filter.category !== ContestCat.ALL ? " short" : "")
                    }>
                    Contest
                  </th>
                  {[...Array(filter.maxIndex - filter.minIndex + 1)].map(
                    (x, i) => {
                      return (
                        <th
                          scope="col"
                          key={
                            "problem-index-" +
                            charInc("A", i + filter.minIndex - 1)
                          }
                          className={"w-problem"}>
                          {charInc("A", i + filter.minIndex - 1)}
                        </th>
                      );
                    }
                  )}
                </tr>
              </thead>
              <tbody className={state.appState.theme.bg}>
                <ContestList
                  contestlist={
                    randomContest === -1
                      ? paginate()
                      : [contestList.contests[randomContest]]
                  }
                  category={filter.category}
                  submissions={submissions}
                  showColor={filter.showColor}
                  showDate={filter.showDate}
                  maxIndex={filter.maxIndex}
                  minIndex={filter.minIndex}
                  showRating={filter.showRating}
                  perPage={filter.perPage}
                  pageSelected={selected}
                  theme={state.appState.theme}
                />
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <footer className={"pt-2 " + state.appState.theme.bg}>
        <Pagination
          pageSelected={(e) => setSelected(e)}
          perPage={filter.perPage}
          selected={selected}
          theme={state.appState.theme}
          totalCount={contestList.contests.length}
          pageSize={(e) => {
            setFilter({ ...filter, perPage: e });
          }}
        />
      </footer>
    </>
  );
};

export default ContestPage;
