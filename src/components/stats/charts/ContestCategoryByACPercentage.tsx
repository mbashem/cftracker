import { useMemo } from "react";
import { ContestCat } from "../../../types/CF/Contest";
import { SimpleVerdict } from "../../../types/CF/Submission";
import PieChart, { PieChartData, PieChartDataSet } from "../../Common/charts/PieChart";
import { Color } from "../../../util/Theme";
import DefaultValueMap from "../../../util/DefaultValueMap";

interface ContestCategoriesByACPercentageProps {
  category: ContestCat;
  simpleVerdictCounts: DefaultValueMap<SimpleVerdict, number>;
}

function ContestCategoryByACPercentage({ category, simpleVerdictCounts }: ContestCategoriesByACPercentageProps) {
  const { labels, pieChartData } = useMemo(() => {
    let pieChartData: PieChartData[] = [];
    let labels: string[] = [];

    for (let simpleVerdict of Object.values(SimpleVerdict)) {
      console.log(simpleVerdict, simpleVerdictCounts.get(simpleVerdict));
      pieChartData.push({
        data: simpleVerdictCounts.get(simpleVerdict) ?? 0,
        backgroundColor: getColorForVerdict(simpleVerdict),
      });
    }

    return { labels, pieChartData };
  }, [simpleVerdictCounts]);

  function getColorForVerdict(verdict: SimpleVerdict): Color {
    switch (verdict) {
      case SimpleVerdict.SOLVED:
        return Color.Green;
      case SimpleVerdict.ATTEMPTED:
        return Color.Red;
      case SimpleVerdict.UNSOLVED:
        return Color.Coral;
    }
  }

  const pieChartDataSet: PieChartDataSet = useMemo(
    () => ({
      label: category,
      data: pieChartData,
    }),
    [labels, pieChartData]
  );

  return <PieChart title={category} labels={labels} dataSets={[pieChartDataSet]} />;
}

export default ContestCategoryByACPercentage;
