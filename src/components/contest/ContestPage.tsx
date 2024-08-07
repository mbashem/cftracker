import { useEffect, useState } from "react";
import ContestList from "./ContestList";
import { SEARCH } from "../../util/constants";
import { useAppSelector } from "../../data/store";
import { getObj, getSet, saveObj, saveSet } from "../../util/localstorage";
import { Alert } from "react-bootstrap";
import { ThreeDots } from "react-loader-spinner";
import { useSearchParams } from "react-router-dom";
import useSubmissionsStore from "../../data/hooks/useSubmissionsStore";
import useContestStore from "../../data/hooks/useContestStore";
import useTheme from "../../data/hooks/useTheme";
import { Verdict } from "../../types/CF/Submission";
import Contest, { ContestCat } from "../../types/CF/Contest";
import { ParticipantType } from "../../types/CF/Party";
import Filter from "../Common/Filter";
import InputChecked from "../Common/Forms/InputChecked";
import CustomModal from "../Common/CustomModal";
import CheckList from "../Common/Forms/CheckList";
import Pagination from "../Common/Pagination";

const ContestPage = () => {
  const state = useAppSelector((state) => {
    return {
      appState: state.appState,
      problemList: state.problemList,
    };
  });
  const { theme } = useTheme();

  const [searchParams, setSearchParams] = useSearchParams();
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
    search: searchParams.get(SEARCH) ?? "",
  };

  enum ContestSave {
    CONTEST_SOLVE_STATUS = "CONTEST_SOLVE_STATUS",
    PARTICIPANT_TYPE = "PARTICIPANT_TYPE",
    CONTEST_FILTER = "CONTEST_FILTER",
  }

  const [filter, setFilter] = useState<filt>(getObj(ContestSave.CONTEST_FILTER, defaultFilt));

  const SOLVEBUTTONS = [Verdict.SOLVED, Verdict.ATTEMPTED, Verdict.UNSOLVED];

  const PARTICIPANTSTYPE = Object.keys(ParticipantType);

  const [selected, setSelected] = useState(0);
  const [solveStatus, setSolveStatus] = useState(getSet(ContestSave.CONTEST_SOLVE_STATUS, SOLVEBUTTONS));
  const [participant, setParticipant] = useState(getSet(ContestSave.PARTICIPANT_TYPE, PARTICIPANTSTYPE));

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
    saveObj(ContestSave.CONTEST_FILTER, filter);
    if (filter.search.trim().length) setSearchParams({ [SEARCH]: filter.search.trim() });
    else setSearchParams();

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
