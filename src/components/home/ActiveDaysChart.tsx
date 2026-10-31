import { memo, useMemo } from "react";
import type Submission from "../../types/CF/Submission";
import ReactCalendarHeatMap from "../common/charts/heat-maps/ReactCalendarHeatMap";
import { SnapshotPeriod, type SnapshotDateRange } from "./homeStatistics";
import { getActivityHeatmap } from "./activityHeatmap";

interface ActiveDaysChartProps extends SnapshotDateRange {
  submissions: readonly Pick<Submission, "creationTimeSeconds">[];
  period?: SnapshotPeriod;
}

function ActiveDaysChart({ submissions, startTimeSeconds, endTimeSeconds, period = SnapshotPeriod.WEEK }: ActiveDaysChartProps) {
  const { data, granularity } = useMemo(
    () => getActivityHeatmap(submissions, { startTimeSeconds, endTimeSeconds }, period),
    [submissions, startTimeSeconds, endTimeSeconds, period],
  );
  const maximum = data.reduce((max, cell) => Math.max(max, cell.value), 5);

  return (
    <ReactCalendarHeatMap
      compact
      data={data}
      minimumValueForMaxColor={maximum}
      label={`${({ day: "Daily", week: "Weekly", month: "Monthly", year: "Yearly" })[granularity]} submission activity for the selected range`}
    />
  );
}

export default memo(ActiveDaysChart);
