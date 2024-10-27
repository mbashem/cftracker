// ProblemListCell.tsx
import React from "react";
import Problem from "../../../types/CF/Problem";
import { Verdict } from "../../../types/CF/Submission";
import Theme from "../../../util/Theme";
import ProblemCell from "./ProblemCell";

interface ProblemListCellProps {
  problems: Problem[];
  contestId: number;
  index: string;
  theme: Theme;
  showColor: boolean;
  showRating: boolean;
  submissions: Map<Verdict, Set<string>> | undefined;
}

function ProblemListCell({
  problems,
  contestId,
  index,
  theme,
  showColor,
  showRating,
  submissions,
}: ProblemListCellProps) {
  if (problems.length === 0) {
    return <td key={`${contestId}${index}`} className={`EMPTY ${theme.bg} w-problem`}></td>;
  }

  const EMPTY = "EMPTY " + theme.bg;

  switch (problems.length) {
    case 0:
      return <td key={contestId + index} className={EMPTY + "w-problem "}></td>;

    case 1:
      return (
        <td className="p-0 w-problem" key={contestId + index.charAt(0) + "1"}>
          <ProblemCell
            problem={problems[0]}
            inside={0}
            len={0}
            contestVerdicts={submissions}
            theme={theme}
            showColor={showColor}
            showRating={showRating}
          />
        </td>
      );

    case 2:
    case 3:
      return (
        <td className="p-0 w-problem" key={`${contestId}${index}`}>
          <div className="d-flex h-100">
            {problems.map((problem, i) => (
              <ProblemCell
                key={problem.index}
                problem={problem}
                inside={problems.length === 0 ? 0 : i + 1}
                len={problems.length}
                contestVerdicts={submissions}
                theme={theme}
                showColor={showColor}
                showRating={showRating}
              />
            ))}
          </div>
        </td>
      );

    default:
      return (
        <td className="inside p-0 w-problem" key={`${contestId}${index}`}>
          More than 3
        </td>
      );
  }
}

export default ProblemListCell;
