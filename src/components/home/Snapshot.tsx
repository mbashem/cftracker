import useAppNavigation from "../../hooks/useAppNavigation";
import useTheme from "../../data/hooks/useTheme";
import { Verdict } from "../../types/CF/Submission";
import { SearchKeys } from "../../util/constants";
import { Path } from "../../util/route/path";
import type { ContestIdRange } from "../../util/submissionProblems";
import CheckList from "../common/forms/CheckList";
import InputDateRange from "../common/forms/Input/InputDateRange";
import Card from "../common/cards/Card";
import {
  SnapshotPeriod,
  type HomeStatistics,
  type SnapshotCustomRange,
  type SnapshotDateRange,
} from "./homeStatistics";

const SNAPSHOT_PERIODS = Object.values(SnapshotPeriod);
const SECONDS_PER_DAY = 86_400;

interface SnapshotProps {
  statistics: HomeStatistics;
  statisticDetails: {
    solvedContestRange?: ContestIdRange;
    ratedContestRange?: ContestIdRange;
    attemptedContestRange?: ContestIdRange;
  };
  period: SnapshotPeriod;
  range: SnapshotDateRange;
  customRange: SnapshotCustomRange;
  hasHandles: boolean;
  hasSubmissions: boolean;
  hasError: boolean;
  isLoading: boolean;
  onPeriodChange: (period: SnapshotPeriod) => void;
  onCustomRangeChange: (range: SnapshotCustomRange) => void;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-GB");
}

function addContestRange(searchParams: URLSearchParams, range: ContestIdRange | undefined) {
  if (range === undefined) return;
  searchParams.set(SearchKeys.MinContestId, String(range.min));
  searchParams.set(SearchKeys.MaxContestId, String(range.max));
}

function addSubmissionRange(searchParams: URLSearchParams, range: SnapshotDateRange) {
  if (range.startTimeSeconds !== undefined) {
    searchParams.set(SearchKeys.SubmittedAfter, String(range.startTimeSeconds));
  }
  if (range.endTimeSeconds !== undefined) {
    searchParams.set(SearchKeys.SubmittedBefore, String(range.endTimeSeconds));
  }
}

function getPeriodText(period: SnapshotPeriod) {
  switch (period) {
    case SnapshotPeriod.WEEK:
      return "this week";
    case SnapshotPeriod.MONTH:
      return "this month";
    case SnapshotPeriod.YEAR:
      return "this year";
    case SnapshotPeriod.CUSTOM:
      return "in the selected range";
  }
}

function getRangeLabel(period: SnapshotPeriod, customRange: SnapshotCustomRange) {
  if (period !== SnapshotPeriod.CUSTOM) return `Current ${period.toLowerCase()}`;
  if (customRange.minDate !== undefined && customRange.maxDate !== undefined) {
    return `${customRange.minDate} to ${customRange.maxDate}`;
  }
  if (customRange.minDate !== undefined) return `Since ${customRange.minDate}`;
  if (customRange.maxDate !== undefined) return `Through ${customRange.maxDate}`;
  return "All time";
}

function getRangeDayCount(range: SnapshotDateRange) {
  if (range.startTimeSeconds === undefined || range.endTimeSeconds === undefined) return undefined;
  return Math.round((range.endTimeSeconds - range.startTimeSeconds) / SECONDS_PER_DAY);
}

function Snapshot({
  statistics,
  statisticDetails,
  period,
  range,
  customRange,
  hasHandles,
  hasSubmissions,
  hasError,
  isLoading,
  onPeriodChange,
  onCustomRangeChange,
}: SnapshotProps) {
  const { navigateTo } = useAppNavigation();
  const { theme } = useTheme();
  const canShowStatistics = hasHandles && (!hasError || hasSubmissions);
  const unavailableValue = "—";
  const periodText = getPeriodText(period);
  const rangeDayCount = getRangeDayCount(range);
  const detailsParams = new URLSearchParams({
    [SearchKeys.Status]: Verdict.SOLVED,
    [SearchKeys.UseFilterStorage]: "false",
  });
  addSubmissionRange(detailsParams, range);
  addContestRange(detailsParams, statisticDetails.solvedContestRange);
  const averageRatingDetailsParams = new URLSearchParams(detailsParams);
  averageRatingDetailsParams.set(SearchKeys.ShowUnrated, "false");
  addContestRange(averageRatingDetailsParams, statisticDetails.ratedContestRange);
  const attemptedDetailsParams = new URLSearchParams({
    [SearchKeys.Status]: Verdict.ATTEMPTED,
    [SearchKeys.UseFilterStorage]: "false",
  });
  addSubmissionRange(attemptedDetailsParams, range);
  addContestRange(attemptedDetailsParams, statisticDetails.attemptedContestRange);
  const cards = [
    {
      label: `Solved ${periodText}`,
      value: canShowStatistics ? formatNumber(statistics.solvedCount) : unavailableValue,
      description: `Unique accepted problems ${periodText}.`,
      searchParams: detailsParams,
    },
    {
      label: "Active days",
      value: canShowStatistics
        ? `${formatNumber(statistics.activeDays)}${rangeDayCount === undefined ? "" : ` / ${formatNumber(rangeDayCount)}`}`
        : unavailableValue,
      description: `Days with at least one accepted solution ${periodText}.`,
      searchParams: detailsParams,
    },
    {
      label: "Average solved rating",
      value: canShowStatistics && statistics.averageSolvedRating !== undefined
        ? (
          <span className={theme.color(statistics.averageSolvedRating)}>
            {formatNumber(Math.round(statistics.averageSolvedRating))}
          </span>
        )
        : unavailableValue,
      description: `Average rating of rated problems solved ${periodText}.`,
      searchParams: averageRatingDetailsParams,
    },
    {
      label: "Attempted, not solved",
      value: canShowStatistics ? formatNumber(statistics.attemptedUnsolvedCount) : unavailableValue,
      description: `Problems attempted but not solved ${periodText}.`,
      searchParams: attemptedDetailsParams,
    },
  ];

  return (
    <section className="mb-5" aria-labelledby="snapshot-heading" aria-busy={isLoading}>
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-3">
        <div>
          <p className="home-section-kicker text-uppercase fw-semibold mb-1">Progress</p>
          <h2 className="h3 fw-bold mb-0" id="snapshot-heading">Snapshot</h2>
          <span className="home-snapshot-range small">{getRangeLabel(period, customRange)}</span>
        </div>
        <CheckList
          items={SNAPSHOT_PERIODS}
          active={new Set([period])}
          name=""
          onClick={onPeriodChange}
          theme={theme}
        />
      </div>

      {period === SnapshotPeriod.CUSTOM && (
        <InputDateRange
          name="Submission date"
          minValue={customRange.minDate}
          maxValue={customRange.maxDate}
          theme={theme}
          className="flex-column flex-md-row gap-2 mb-3"
          onMinChange={(minDate) => onCustomRangeChange({ ...customRange, minDate })}
          onMaxChange={(maxDate) => onCustomRangeChange({ ...customRange, maxDate })}
        />
      )}

      <ul className="row g-3 list-unstyled mb-0">
        {cards.map((card) => (
          <li className="col-12 col-sm-6 col-xl-3" key={card.label}>
            <Card
              type="stacked"
              title={card.label}
              content={isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                  <span className="visually-hidden">Loading</span>
                </>
              ) : card.value}
              description={card.description}
              onClick={canShowStatistics && !isLoading
                ? () => navigateTo(Path.PROBLEMS, card.searchParams)
                : undefined}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default Snapshot;
