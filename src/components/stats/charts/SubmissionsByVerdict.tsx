import { memo } from "react";
import Submission, { Verdict } from "../../../types/CF/Submission";
import PieChart, { PieChartData, PieChartDataSet } from "../../common/charts/PieChart";
import { Color } from "../../../util/Theme";
import { isDefined } from "../../../util/util";

interface SubmissionsByVerdictProps {
  submissionsByVerdict: Map<Verdict, Submission[]>;
}

function SubmissionsByVerdict({ submissionsByVerdict }: SubmissionsByVerdictProps) {
  let pieChartData: PieChartData[] = [];
  let labels: string[] = [];

  for (let verdict of Object.values(Verdict)) {
    let submissions = submissionsByVerdict.get(verdict);
    if (!isDefined(submissions)) continue;

    labels.push(verdict);
    pieChartData.push({
      data: submissions.length,
      backgroundColor: getColorForVerdict(verdict),
    });
  }

  function getColorForVerdict(verdict: Verdict): Color | undefined {
    switch (verdict) {
      case Verdict.OK:
        return Color.Green;
      case Verdict.WRONG_ANSWER:
        return Color.Red;
    }
  }

  const pieChartDataSet: PieChartDataSet = {
    label: "Submissions by Verdict",
    data: pieChartData,
  };

  return (
    <>
      <PieChart title={"Submissions By Verdict"} labels={labels} dataSets={[pieChartDataSet]} />
    </>
  );
}

export default memo(SubmissionsByVerdict);
