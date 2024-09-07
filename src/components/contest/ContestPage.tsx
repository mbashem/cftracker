import { useEffect, useState } from "react";
import { Alert } from "react-bootstrap";
import ContestList from "./ContestList";
import { SearchKeys } from "../../util/constants";
import { useAppSelector } from "../../data/store";
import useSubmissionsStore from "../../data/hooks/useSubmissionsStore";
import useContestStore from "../../data/hooks/useContestStore";
import useTheme from "../../data/hooks/useTheme";
import { Verdict } from "../../types/CF/Submission";
import Contest, { ContestCat } from "../../types/CF/Contest";
import { ParticipantType } from "../../types/CF/Party";
import Filter from "../Common/Filter";
import InputChecked from "../Common/Forms/Input/InputChecked";
import CustomModal from "../Common/CustomModal";
import CheckList from "../Common/Forms/CheckList";
import Pagination from "../Common/Pagination";
import { StorageService } from "../../util/StorageService";
import useAppSearchParams from "../../hooks/useSearchParam";
import Loading from "../Common/Loading";

const ContestPage = () => {
  const state = useAppSelector((state) => {
    return {
      appState: state.appState,
      problemList: state.problemList,
    };
  });
  const { theme } = useTheme();

  const { searchParams, updateSearchParam, deleteSearchParam } = useAppSearchParams();
  const { submissions: userSubmissions } = useSubmissionsStore();
  const { contests } = useContestStore();

  const [contestList, setContestList] = useState<{
    contests: Contest[];
    error: string;
  }>({ contests: [], error: "" });
  const [randomContest, setRandomContest] = useState(-1);

  interface filt {
    perPage: number;
    showDate: boolean;
    showRating: boolean;
    showColor: boolean;
    search: string;
    category: ContestCat;
    // ShowContestId: boolean;
  }

  const defaultFilt: filt = {
    perPage: 100,
    showDate: false,
    showRating: true,
    showColor: true,
    // ShowContestId: false,
    category: ContestCat.DIV2,
    search: searchParams.get(SearchKeys.Search) ?? "",
  };

  enum ContestSave {
    SolveStatus = "CONTEST_SOLVE_STATUS",
    ParticipantType = "PARTICIPANT_TYPE",
    Filter = "CONTEST_FILTER",
  }

  const [filter, setFilter] = useState<filt>(StorageService.getObject(ContestSave.Filter, defaultFilt));

  const SOLVEBUTTONS = [Verdict.SOLVED, Verdict.ATTEMPTED, Verdict.UNSOLVED];

  const PARTICIPANTSTYPE = Object.keys(ParticipantType);

  const [selected, setSelected] = useState(0);
  const [solveStatus, setSolveStatus] = useState(StorageService.getSet(ContestSave.SolveStatus, SOLVEBUTTONS));
  const [participant, setParticipant] = useState(StorageService.getSet(ContestSave.ParticipantType, PARTICIPANTSTYPE));

  const [submissions, setSubmissions] = useState<Map<number, Map<Verdict, Set<string>>>>(new Map());

  const contestStatus = (contest: Contest) => {
    if (!submissions.has(contest.id)) return Verdict.UNSOLVED;
    if (submissions.get(contest.id)?.has(Verdict.SOLVED)) return Verdict.SOLVED;
    return Verdict.ATTEMPTED;
  };

  const filterContest = (contest: Contest) => {
    let status = solveStatus.has(contestStatus(contest));

    let searchIncluded = true;

    let text = filter.search.toLowerCase().trim();

    if (text.length) searchIncluded = contest.name.toLowerCase().includes(text) || contest.id.toString().includes(text);

    let catIn = false;

    if (filter.category === ContestCat.ALL || filter.category === contest.category) catIn = true;

    return status && searchIncluded && contest.count !== 0 && catIn;
  };

  useEffect(() => {
    StorageService.saveObject(ContestSave.Filter, filter);
    if (filter.search.trim().length) updateSearchParam(SearchKeys.Search, filter.search.trim());
    else deleteSearchParam(SearchKeys.Search);

    const newContestList = contests.filter((contest) => filterContest(contest));

    setContestList({ ...contestList, contests: newContestList });
    setRandomContest(-1);
  }, [state.problemList.problems, filter, solveStatus, submissions]);

  useEffect(() => {
    let currRec: Map<number, Map<Verdict, Set<string>>> = new Map();
    for (let sub of userSubmissions) {
      if (sub.contestId === undefined || sub.index === undefined || !participant.has(sub.author.participantType))
        continue;
      let ver = sub.verdict === Verdict.OK ? Verdict.SOLVED : Verdict.ATTEMPTED;
      if (!currRec.has(sub.contestId)) currRec.set(sub.contestId, new Map<Verdict, Set<string>>());
      if (!currRec.get(sub.contestId)!.has(ver)) currRec.get(sub.contestId)!.set(ver, new Set());
      currRec.get(sub.contestId)!.get(ver)!.add(sub.index);
    }
    setSubmissions(currRec);
  }, [userSubmissions, participant]);

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
          theme={theme}
        >
          <CustomModal title="filter" theme={theme}>
            <div className="group">
              <div className="d-flex flex-column justify-content-between pb-2 w-100">
                <div className="d-flex row justify-content-between pt-1">
                  <div className="col-4">
                    <InputChecked
                      header="Date"
                      name="showDate"
                      checked={filter.showDate}
                      title={"Show Date?"}
                      theme={theme}
                      onChange={() => {
                        setFilter({ ...filter, showDate: !filter.showDate });
                      }}
                    />
                  </div>
                  <div className="col-4">
                    <InputChecked
                      header="Rating"
                      name="showRating"
                      checked={filter.showRating}
                      title={"Show Rating?"}
                      theme={theme}
                      onChange={() => {
                        setFilter({
                          ...filter,
                          showRating: !filter.showRating,
                        });
                      }}
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
                        setFilter({ ...filter, showColor: !filter.showColor });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <CheckList
              items={SOLVEBUTTONS}
              active={solveStatus}
              name={"Solve Status"}
              onClickSet={(newSet) => {
                setSolveStatus(newSet);
                StorageService.saveSet(ContestSave.SolveStatus, newSet);
              }}
            />
            <CheckList
              items={PARTICIPANTSTYPE}
              active={participant}
              name={"Participant Type"}
              onClickSet={(newSet) => {
                setParticipant(newSet);
                StorageService.saveSet(ContestSave.ParticipantType, newSet);
              }}
            />
          </CustomModal>
        </Filter>
        <div className="pt-3 ps-3" style={{ width: "800px" }}>
          <CheckList
            items={Object.values(ContestCat)}
            active={new Set([filter.category])}
            name={""}
            onClick={(str) => {
              setFilter({ ...filter, category: str as ContestCat });
              setSelected(0);
            }}
            activeClass="btn-secondary active"
            inactiveClass="btn-secondary"
            btnClass="p-1 btn"
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
                    contestlist={randomContest === -1 ? paginate() : [contestList.contests[randomContest]]}
                    category={filter.category}
                    submissions={submissions}
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
          pageSize={(e) => {
            setFilter({ ...filter, perPage: e });
          }}
        />
      </footer>
    </>
  );
};

export default ContestPage;
