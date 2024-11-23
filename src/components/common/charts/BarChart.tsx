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
  TooltipModel,
  TooltipItem,
} from "chart.js";
import { Color } from "../../../util/Theme";
import { getFormattedString, isDefined, isNumber } from "../../../util/util";
import useTheme from "../../../data/hooks/useTheme";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export interface BarChartDataSet {
  label: string;
  data: number[];
  color?: Color | Color[];
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
      let backgroundColor: string | string[] | undefined;
      if (isDefined(dataSet.color)) {
        if (Array.isArray(dataSet.color)) {
          backgroundColor = dataSet.color.map((color) => theme.hexColor(color));
        } else backgroundColor = theme.hexColor(dataSet.color);
      }

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
        datalabels: {
          display: false,
          formatter: (value: number, _context: any) => {
            return `${value.toFixed(0)}`;
          },
          color: "#fff",
          font: {
            weight: "bold",
          },
        },
        legend: {
          display: !!title,
          position: "top",
        },
        title: {
          display: !!title,
          text: title || "",
          color: "#6c757d",
        },
        tooltip: {
          callbacks: {
            label: function (this: TooltipModel<"bar">, tooltipItem: TooltipItem<"bar">) {
              let value = tooltipItem.raw;
              if (isNumber(value)) {
                return getFormattedString(value);
              }
              return "unknown";
            },
          },
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
