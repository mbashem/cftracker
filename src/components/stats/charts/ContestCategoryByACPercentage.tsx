import { useMemo } from "react";
import { ContestCat } from "../../../types/CF/Contest";
import { SimpleVerdict } from "../../../types/CF/Submission";
import PieChart, { PieChartData, PieChartDataSet } from "../../common/charts/PieChart";
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

    for (const simpleVerdict of [SimpleVerdict.SOLVED, SimpleVerdict.ATTEMPTED]) {
      labels.push(simpleVerdict);
      pieChartData.push({
        data: simpleVerdictCounts.get(simpleVerdict) ?? 0,
        backgroundColor: simpleVerdict === SimpleVerdict.SOLVED ? Color.Green : Color.Red,
      });
    }

    return { labels, pieChartData };
  }, [simpleVerdictCounts]);

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
