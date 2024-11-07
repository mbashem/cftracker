import { useMemo } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartDataset } from "chart.js";
import { ChartData, ChartOptions } from "chart.js";
import { Color } from "../../../util/Theme";
import useTheme from "../../../data/hooks/useTheme";
import { isDefined, isNumber } from "../../../util/util";

ChartJS.register(ArcElement, Tooltip, Legend);

export interface PieChartData {
  data: number;
  backgroundColor?: Color;
}

export interface PieChartDataSet {
  label: string;
  data: PieChartData[];
}

interface PieChartProps {
  title?: string;
  labels: string[];
  dataSets: PieChartDataSet[];
}

function PieChart({ title, labels, dataSets: propDataSet }: PieChartProps) {
  const { theme } = useTheme();

  const dataSets = useMemo(() => {
    let dataSets: ChartDataset<"pie">[] = [];

    for (let dataSet of propDataSet) {
      let availableColors = new Set(Object.values(Color).filter((value) => isNumber(value)) as Color[]);

      for (let data of dataSet.data) if (isDefined(data.backgroundColor)) availableColors.delete(data.backgroundColor);

      let datas: number[] = [];
      let backgroundColors: string[] = [];

      for (let currentValue of dataSet.data) {
        datas.push(currentValue.data);
        let backgroundColor: Color = currentValue.backgroundColor ?? availableColors.values().next().value ?? Color.Red;

        let hexColor = theme.hexColor(backgroundColor);
        backgroundColors.push(hexColor);

        availableColors.delete(backgroundColor);
      }

      dataSets.push({
        label: dataSet.label,
        data: datas,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors,
      });
    }

    return dataSets;
  }, [labels, propDataSet, theme]);

  let data: ChartData<"pie"> = useMemo(
    () => ({
      labels: labels,
      datasets: dataSets,
    }),
    [dataSets, labels]
  );

  const options: ChartOptions<"pie"> = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
        title: {
          display: isDefined(title),
          text: title,
        },
        tooltip: {
          callbacks: {
            label: (tooltipItem) => `${tooltipItem.raw}`,
          },
        },
      },
    }),
    [title]
  );

  return <Pie data={data} options={options} />;
}

export default PieChart;
