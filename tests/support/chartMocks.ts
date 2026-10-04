import { vi } from "vitest";
import type { ChartData, ChartOptions } from "chart.js";

interface ChartCapture<T extends "bar" | "pie"> {
  data: ChartData<T>;
  options?: ChartOptions<T>;
}
interface ChartMocks {
  bars: Map<string, ChartCapture<"bar">>;
  pies: Map<string, ChartCapture<"pie">>;
}
const charts: ChartMocks = vi.hoisted(() => ({ bars: new Map(), pies: new Map() }));

// Only the canvas renderer is replaced: application chart data/options stay real.
vi.mock("react-chartjs-2", async () => {
  const { createElement } = await import("react");
  return {
    Bar: (props: ChartCapture<"bar">) => {
      const title = String(props.options?.plugins?.title?.text ?? "Bar chart");
      charts.bars.set(title, props);
      return createElement("div", { role: "img", "aria-label": title });
    },
    Pie: (props: ChartCapture<"pie">) => {
      const title = String(props.options?.plugins?.title?.text ?? "Pie chart");
      charts.pies.set(title, props);
      return createElement("div", { role: "img", "aria-label": title });
    },
  };
});

export function resetChartMocks() {
  charts.bars.clear();
  charts.pies.clear();
}
export { charts };
