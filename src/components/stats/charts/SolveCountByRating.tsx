import { useMemo } from "react";
import { SimpleVerdict } from "../../../types/CF/Submission";
import BarChart, { BarChartDataSet } from "../../common/charts/BarChart";
import { RATING_CONSTANTS } from "../../../util/constants";
import useTheme from "../../../data/hooks/useTheme";
import { Color } from "../../../util/Theme";

interface SolveCountByRatingProps {
  problemIDsGroupedBySimpleVerdict: Map<SimpleVerdict, Map<number, Set<string>>>;
  ratingLabels: number[];
}

function SolveCountByRating({ ratingLabels, problemIDsGroupedBySimpleVerdict }: SolveCountByRatingProps) {
  const { theme } = useTheme();

  const dataSets = useMemo(() => {
    let solved: number[] = [];
    let attempted: number[] = [];

    for (let rating = RATING_CONSTANTS.min; rating <= RATING_CONSTANTS.max; rating += RATING_CONSTANTS.interval) {
      solved.push(problemIDsGroupedBySimpleVerdict.get(SimpleVerdict.SOLVED)?.get(rating)?.size ?? 0);
      attempted.push(problemIDsGroupedBySimpleVerdict.get(SimpleVerdict.ATTEMPTED)?.get(rating)?.size ?? 0);
    }

    let dataSets: BarChartDataSet[] = [
      {
        label: "Solved",
        data: solved,
        color: Color.Green,
      },
      {
        label: "Attempted",
        data: attempted,
        color: Color.Red,
      },
    ];
    return dataSets;
  }, [problemIDsGroupedBySimpleVerdict, theme]);

  return <BarChart title={"Solve Count By Ratings"} labels={ratingLabels} dataSets={dataSets} />;
}

export default SolveCountByRating;