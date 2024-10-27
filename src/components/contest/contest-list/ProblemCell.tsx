import Problem from "../../../types/CF/Problem";
import { Verdict } from "../../../types/CF/Submission";
import Theme, { ThemesType } from "../../../util/Theme";
import { getProblemUrl, isDefined } from "../../../util/util";

interface ContestProblemCellProps {
  problem: Problem;
  inside: number;
  len: number;
  contestVerdicts: Map<Verdict, Set<string>> | undefined;
  theme: Theme;
  showColor: boolean;
  showRating: boolean;
}

function ContestProblemCell({
  problem,
  inside = 0,
  len = 0,
  contestVerdicts,
  theme,
  showColor,
  showRating,
}: ContestProblemCellProps) {
  if (problem.contestId === undefined) return;
  let solved = false;
  let attempted = false;

  const getStatus = (problem: Problem) => {
    if (!isDefined(contestVerdicts)) return Verdict.UNSOLVED;

    if (contestVerdicts.get(Verdict.SOLVED)?.has(problem.index)) return Verdict.SOLVED;

    if (contestVerdicts.get(Verdict.ATTEMPTED)?.has(problem.index)) return Verdict.ATTEMPTED;

    return Verdict.UNSOLVED;
  };

  let v = getStatus(problem);
  if (v === Verdict.SOLVED) solved = true;
  if (v === Verdict.ATTEMPTED) attempted = true;

  let name = problem.name;
  let id = problem.id;

  let className =
    (solved ? theme.bgSuccess : attempted ? theme.bgDanger : "") +
    (inside ? (len == 3 ? " w-100 pb-3 ps-1 pe-0 " : " w-50 ") : " w-100 ");

  return (
    <div
      className={
        className +
        " p-2 h-100 " +
        (inside !== len && inside !== 0
          ? " pe-0 border-end" + (theme.themeType === ThemesType.DARK ? " border-dark" : "")
          : "")
      }
      key={id}
    >
      <a
        className={
          (len !== 3 ? "text-truncate " : "") +
          "text-decoration-none wrap font-bold d-inline-block  " +
          (showColor ? theme.color(problem.rating ?? 0) : theme.text)
        }
        target="_blank"
        rel="noreferrer"
        tabIndex={0}
        title={problem.name + ",Rating:" + (problem.rating ?? 0 > 0 ? problem.rating : "Not Rated")}
        data-bs-html="true"
        data-bs-toggle="tooltip"
        data-bs-placement="top"
        href={getProblemUrl(problem.contestId!, problem.index)}
      >
        <span>
          {problem.index}
          {len == 3 ? "" : ". " + name}
        </span>
        {showRating ? (
          <span className="fs-6">
            <br />
            {len == 3 ? "" : "("}
            {problem.rating ? problem.rating : "N/A"}
            {len == 3 ? "" : ")"}
          </span>
        ) : (
          ""
        )}
      </a>
      {/* </OverlayTrigger> */}
    </div>
  );
};

export default ContestProblemCell;
