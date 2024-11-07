import { useMemo } from "react";
import useSubmissionsStore from "../../../data/hooks/useSubmissionsStore";
import BarChart, { BarChartDataSet } from "../../Common/charts/BarChart";
import { Verdict } from "../../../types/CF/Submission";
import { Color } from "../../../util/Theme";
import { isDefined } from "../../../util/util";

interface RatingByACPercentageProps {
  ratingLabels: number[];
}

function RatingByACPercentage({ ratingLabels }: RatingByACPercentageProps) {
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

    for (let rating of ratingLabels) {
      let totalSubmission = totalSubmissions.get(rating);
      if (!isDefined(totalSubmission)) {
        acPercentages.push(0);
        continue;
      }

      let acSubmissionsCount = acSubmissions.get(rating) ?? 0;
      let acPercentage = (acSubmissionsCount / totalSubmission) * 100.0;

      acPercentages.push(acPercentage);
    }

    let dataSets: BarChartDataSet[] = [
      {
        label: "AC",
        data: acPercentages,
        color: Color.Green,
      },
    ];

    return dataSets;
  }, [submissions, ratingLabels]);

  return <BarChart title="Rating By AC Percentage" labels={ratingLabels} dataSets={ratingByACPercentageDataset} yMin={0} yMax={100} />;
}

export default RatingByACPercentage;
