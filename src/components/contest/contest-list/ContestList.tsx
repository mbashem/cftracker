import React, { useMemo } from "react";
import { increment } from "../../../util/util";
import Contest from "../../../types/CF/Contest";
import { Verdict } from "../../../types/CF/Submission";
import Theme from "../../../util/Theme";
import ContestRow from "./ContestRow";

interface PropsType {
  contestlist: Contest[];
  showDate: boolean;
  perPage: number;
  pageSelected: number;
  theme: Theme;
  showRating: boolean;
  showColor: boolean;
  shouldShowShortName: boolean;
  showCategoryName: boolean;
  submissions: Map<number, Map<Verdict, Set<string>>>;
}

function ContestList(props: PropsType) {
  const problemIndexRange = useMemo(() => {
    let maxIndex: number = 0;

    for (let contest of props.contestlist) {
      if (contest.mxInd > maxIndex) {
        maxIndex = contest.mxInd;
      }
    }
    return { minIndex: 1, maxIndex: maxIndex };
  }, [props.contestlist]);

  return (
    <React.Fragment>
      {/* Setting table height to 1px fixes the issue when date is enabled tableCells div child not taking full height.
      https://www.reddit.com/r/css/comments/17m903e/comment/k7jpdzx/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button
      */}
      <table className={"table table-bordered m-0 " + props.theme.table} style={{ height: "1px" }}>
        <thead className={props.theme.thead}>
          <tr>
            <th scope="col" className="w-sl first-column" style={{ width: "20px" }}>
              #
            </th>
            <th scope="col" className={"w-contest third-column" + (props.shouldShowShortName ? " short" : "")}>
              Contest
            </th>
            {[...Array(problemIndexRange.maxIndex - problemIndexRange.minIndex + 1)].map((_x, i) => {
              return (
                <th scope="col" key={"problem-index-" + increment("A", i)} className={"w-problem"}>
                  {increment("A", i)}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className={props.theme.bg}>
          {props.contestlist.map((contest: Contest, index: number) => (
            <ContestRow
              key={contest.id}
              contest={contest}
              index={index}
              problemIndexRange={problemIndexRange}
              theme={props.theme}
              showRating={props.showRating}
              showColor={props.showColor}
              shouldShowShortName={props.shouldShowShortName}
              showCategoryName={props.showCategoryName}
              showDate={props.showDate}
              pageSelected={props.pageSelected}
              perPage={props.perPage}
              submissions={props.submissions.get(contest.id)}
            />
          ))}
        </tbody>
      </table>
    </React.Fragment>
  );
}

export default ContestList;
