import { memo, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
  ChartDataset,
} from "chart.js";
import { Color } from "../../../util/Theme";
import { isDefined } from "../../../util/util";
import useTheme from "../../../data/hooks/useTheme";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export interface BarChartDataSet {
  label: string;
  data: number[];
  color?: Color;
}

interface BarChartProps<XAxis> {
  labels: XAxis[]; // Labels for each bar
  title?: string; // Optional title for the chart
  dataSets: BarChartDataSet[];
  yMax?: number;
  yMin?: number;
}

function BarChart<XAxis>({ labels, title, dataSets, yMax, yMin }: BarChartProps<XAxis>) {
  const { theme } = useTheme();

  const chartDataDataSet = useMemo(() => {
    let proccesedDataSets: ChartDataset<"bar">[] = [];

    for (let dataSet of dataSets) {
      let backgroundColor: string | undefined;
      if (isDefined(dataSet.color)) backgroundColor = theme.hexColor(dataSet.color);

      proccesedDataSets.push({
        label: dataSet.label,
        data: dataSet.data,
        backgroundColor,
      });
    }

    return proccesedDataSets;
  }, [dataSets, theme]);

  const chartData: ChartData<"bar"> = useMemo(
    () => ({
      labels,
      datasets: chartDataDataSet,
    }),
    [labels, dataSets]
  );

  const options: ChartOptions<"bar"> = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: {
          display: !!title,
          position: "top",
        },
        title: {
          display: !!title,
          text: title || "",
        },
      },
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          beginAtZero: true,
          max: yMax,
          min: yMin,
        },
      },
    }),
    [title, yMax, yMin]
  );

  return <Bar data={chartData} options={options} />;
}

export default memo(BarChart);
