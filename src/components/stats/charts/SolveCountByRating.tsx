import { useMemo } from "react";
import { SimpleVerdict } from "../../../types/CF/Submission";
import BarChart, { BarChartDataSet } from "../../common/charts/BarChart";
import useTheme from "../../../data/hooks/useTheme";
import Theme, { Color } from "../../../util/Theme";
import { RATING_LABELS } from "../../../util/cf";

interface SolveCountByRatingProps {
  problemIDsGroupedBySimpleVerdict: Map<SimpleVerdict, Map<number, Set<string>>>;
}

function SolveCountByRating({ problemIDsGroupedBySimpleVerdict }: SolveCountByRatingProps) {
  const { theme } = useTheme();

  const dataSets = useMemo(() => {
    let solved: number[] = [];
    let attempted: number[] = [];

    for (let rating of RATING_LABELS) {
      solved.push(problemIDsGroupedBySimpleVerdict.get(SimpleVerdict.SOLVED)?.get(rating)?.size ?? 0);
      attempted.push(problemIDsGroupedBySimpleVerdict.get(SimpleVerdict.ATTEMPTED)?.get(rating)?.size ?? 0);
    }

    let dataSets: BarChartDataSet[] = [
      {
        label: "Solved",
        data: solved,
        color: Theme.colorsForRatings,
      },
      {
        label: "Attempted",
        data: attempted,
        color: Color.LightRed,
      },
    ];
    return dataSets;
  }, [problemIDsGroupedBySimpleVerdict, theme]);

  return <BarChart title={"Solve Count By Ratings"} labels={RATING_LABELS} dataSets={dataSets} />;
}

export default SolveCountByRating;
