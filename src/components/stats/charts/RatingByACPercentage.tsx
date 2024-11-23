import { useMemo } from "react";
import useSubmissionsStore from "../../../data/hooks/useSubmissionsStore";
import BarChart, { BarChartDataSet } from "../../common/charts/BarChart";
import { Verdict } from "../../../types/CF/Submission";
import Theme from "../../../util/Theme";
import { isDefined } from "../../../util/util";
import { RATING_LABELS } from "../../../util/cf";

interface RatingByACPercentageProps {}

function RatingByACPercentage({}: RatingByACPercentageProps) {
  const { rawSubmissions: submissions } = useSubmissionsStore();

  const ratingByACPercentageDataset = useMemo(() => {
    const totalSubmissions = new Map<number, number>();
    const acSubmissions = new Map<number, number>();

    for (let submission of submissions) {
      totalSubmissions.set(submission.problem.rating, (totalSubmissions.get(submission.problem.rating) ?? 0) + 1);

      if (submission.verdict === Verdict.OK)
        acSubmissions.set(submission.problem.rating, (acSubmissions.get(submission.problem.rating) ?? 0) + 1);
    }

    let acPercentages: number[] = [];

    for (let rating of RATING_LABELS) {
      let totalSubmission = totalSubmissions.get(rating);
      if (!isDefined(totalSubmission)) {
        acPercentages.push(0);
        continue;
      }

      let acSubmissionsCount = acSubmissions.get(rating) ?? 0;
      let acPercentage = (acSubmissionsCount / totalSubmission) * 100.0;

      acPercentages.push(acPercentage);
    }

    // acPercentages = acPercentages.map((value) => (value < 1 ? 50 : value));

    let dataSets: BarChartDataSet[] = [
      {
        label: "AC",
        data: acPercentages,
        color: Theme.colorsForRatings,
      },
    ];

    return dataSets;
  }, [submissions]);

  return (
    <BarChart
      title="Rating By AC Percentage"
      labels={RATING_LABELS}
      dataSets={ratingByACPercentageDataset}
      yMin={0}
      yMax={100}
    />
  );
}

export default RatingByACPercentage;
