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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export interface BarChartDataSet {
  label: string;
  data: number[];
  color: string;
}

interface BarChartProps<XAxis> {
  labels: XAxis[]; // Labels for each bar
  title?: string; // Optional title for the chart
  dataSets: BarChartDataSet[];
}

function BarChart<XAxis>({ labels, title, dataSets }: BarChartProps<XAxis>) {
  const chartDataDataSet = useMemo(() => {
    let proccesedDataSets: ChartDataset<"bar">[] = [];

    for (let dataSet of dataSets) {
      proccesedDataSets.push({
        label: dataSet.label,
        data: dataSet.data,
        backgroundColor: dataSet.color
      });
    }

    return proccesedDataSets;
  }, [dataSets]);

  const chartData: ChartData<"bar"> = useMemo(() => ({
    labels,
    datasets: chartDataDataSet,
  }), [labels, dataSets]);

  const options: ChartOptions<"bar"> = useMemo(() => ({
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
      },
    },
  }), [title]);

  return <Bar data={chartData} options={options} />;
}

export default memo(BarChart);
