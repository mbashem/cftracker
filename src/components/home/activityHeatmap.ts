import type Submission from "../../types/CF/Submission";
import type { DayData } from "../common/charts/heat-maps/ReactCalendarHeatMap";
import { getStartOfCurrentWeek, SnapshotPeriod, type SnapshotDateRange } from "./homeStatistics";

export type ActivityGranularity = "day" | "week" | "month" | "year";

function calendarDayCount(start: Date, end: Date) {
  return (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
    - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86_400_000;
}

function nextBoundary(date: Date, granularity: ActivityGranularity) {
  switch (granularity) {
    case "day": {
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      return next;
    }
    case "week": {
      const next = getStartOfCurrentWeek(date);
      next.setDate(next.getDate() + 7);
      return next;
    }
    case "month": return new Date(date.getFullYear(), date.getMonth() + 1, 1);
    case "year": return new Date(date.getFullYear() + 1, 0, 1);
  }
}

export function getActivityHeatmap(
  submissions: readonly Pick<Submission, "creationTimeSeconds">[],
  range: SnapshotDateRange,
  period: SnapshotPeriod,
  referenceDate?: Date,
): { granularity: ActivityGranularity; data: DayData[] } {
  let first = Number.POSITIVE_INFINITY;
  for (const submission of submissions) {
    if (range.startTimeSeconds !== undefined && submission.creationTimeSeconds < range.startTimeSeconds) continue;
    if (range.endTimeSeconds !== undefined && submission.creationTimeSeconds >= range.endTimeSeconds) continue;
    first = Math.min(first, submission.creationTimeSeconds);
  }
  const start = new Date((range.startTimeSeconds ?? first) * 1000);
  start.setHours(0, 0, 0, 0);
  const end = range.endTimeSeconds === undefined
    ? new Date(referenceDate ?? Date.now())
    : new Date(range.endTimeSeconds * 1000);
  if (range.endTimeSeconds === undefined) {
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
  }
  const dayCount = calendarDayCount(start, end);
  const granularity: ActivityGranularity = period === SnapshotPeriod.WEEK ? "day"
    : period === SnapshotPeriod.MONTH ? "week"
    : period === SnapshotPeriod.YEAR ? "month"
    : dayCount <= 14 ? "day" : dayCount <= 90 ? "week" : dayCount <= 730 ? "month" : "year";
  if (!Number.isFinite(dayCount) || dayCount <= 0) return { granularity, data: [] };

  const buckets: { date: Date; end: Date; value: number; activeDates: Set<string> }[] = [];
  for (let date = start; date < end;) {
    const boundary = nextBoundary(date, granularity);
    const bucketEnd = boundary < end ? boundary : end;
    buckets.push({ date, end: bucketEnd, value: 0, activeDates: new Set() });
    date = bucketEnd;
  }
  for (const submission of submissions) {
    const timestamp = submission.creationTimeSeconds * 1000;
    const bucket = buckets.find((bucket) => timestamp >= bucket.date.getTime() && timestamp < bucket.end.getTime());
    if (bucket === undefined) continue;
    bucket.value++;
    bucket.activeDates.add(new Date(timestamp).toDateString());
  }
  return {
    granularity,
    data: buckets.map(({ date, end, value, activeDates }) => {
      const lastDay = new Date(end);
      lastDay.setDate(lastDay.getDate() - 1);
      const dates = granularity === "day" ? date.toDateString() : `${date.toDateString()} – ${lastDay.toDateString()}`;
      return {
        date, value,
        label: `${dates}: ${value} ${value === 1 ? "submission" : "submissions"}`
          + (granularity === "day" ? "" : ` · ${activeDates.size}/${calendarDayCount(date, end)} active days`),
      };
    }),
  };
}
