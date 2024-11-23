import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { increment, getContestUrl } from "../../../util/util";
import Contest from "../../../types/CF/Contest";
import { Verdict } from "../../../types/CF/Submission";
import Theme from "../../../util/Theme";
import ProblemListCell from "./ProblemsListCell";
import { formateDate } from "../../../util/time";

interface ContestRowProps {
  contest: Contest;
  index: number;
  problemIndexRange: { minIndex: number; maxIndex: number };
  theme: Theme;
  showRating: boolean;
  showColor: boolean;
  shouldShowShortName: boolean;
  showCategoryName: boolean;
  showDate: boolean;
  pageSelected: number;
  perPage: number;
  submissions: Map<Verdict, Set<string>> | undefined;
}

function ContestRow({
  contest,
  index,
  problemIndexRange,
  theme,
  showRating,
  showColor,
  shouldShowShortName,
  showCategoryName,
  showDate,
  pageSelected,
  perPage,
  submissions,
}: ContestRowProps) {
  const solved = submissions?.get(Verdict.SOLVED)?.size === contest.count;

  const shouldShowCategoryName =
    showCategoryName && shouldShowShortName && contest.isShortAvailable && contest.isCFRound;

  return (
    <tr key={contest.id}>
      <td scope="row" className={"w-sl p-2 first-column " + (solved ? theme.bgSuccess : " ")}>
        <div className="d-inline-block">{pageSelected * perPage + index + 1}</div>
      </td>
      {/* {short ? (
          ""
        ) : (
          <td
            scope="row"
            className={
              "w-id p-2 second-column " + (solved ? theme.bgSuccess : " ")
            }
            title={
              "Solve Count: " + contest.solveCount + " , Total:" + contest.count
            }
          >
            <div className="d-inline-block">{contest.id}</div>
          </td>
        )} */}
      <td
        className={
          "w-contest p-0 h-100 position-relative " +
          (solved ? theme.bgSuccess : " ") +
          (shouldShowShortName ? " short" : " ")
        }
      >
        {shouldShowCategoryName && (
          <span className={`position-absolute ms-0 top-0 start-0 badge rounded-pill ${theme.text}`}>
            {contest.category}
          </span>
        )}
        <div className="d-inline-block w-100 name">
          <OverlayTrigger
            placement={"top"}
            key={`contest-name-${contest.id.toString()}`}
            overlay={
              <Tooltip id={`contest-name-${contest.id.toString()}`}>
                <p className="text-center text-wrap pe-1" style={{ width: "150px" }}>
                  {contest.name}
                </p>
                <p>ID: {contest.id}</p>
              </Tooltip>
            }
          >
            <a
              className={
                "text-decoration-none wrap d-inline-block pt-2 pb-2 ps-2 pe-1 mw-100 " +
                theme.text +
                (shouldShowShortName ? " text-truncate" : " ")
              }
              target="_blank"
              rel="noreferrer"
              //title={contest.name}
              href={getContestUrl(contest.id)}
            >
              <span>{shouldShowShortName ? contest.short : contest.name}</span>
            </a>
          </OverlayTrigger>
        </div>
        {showDate && (
          <span className={`position-absolute ms-0 bottom-0 start-0 badge ${theme.text}`}>
            {formateDate(contest.startTimeSeconds ?? 0)}
          </span>
        )}
      </td>
      {[...Array(problemIndexRange.maxIndex - problemIndexRange.minIndex + 1)].map((_x, i) => {
        let index = increment("A", i);
        return (
          <ProblemListCell
            key={contest.id.toString + index}
            problems={contest.problemList[index] ?? []}
            contestId={contest.id}
            index={index}
            theme={theme}
            showColor={showColor}
            showRating={showRating}
            submissions={submissions}
          />
        );
      })}
    </tr>
  );
}

export default ContestRow;
