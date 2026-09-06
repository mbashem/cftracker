import type { HomeStatistics } from "./homeStatistics";
import { useNavigate } from "react-router";
import { Verdict } from "../../types/CF/Submission";
import { SearchKeys } from "../../util/constants";
import { Path } from "../../util/route/path";
import Card from "../common/cards/Card";
import { CardType } from "../common/cards/CardType";
import { getStartOfCurrentWeek } from "./homeStatistics";
import type { ContestIdRange } from "../../util/submissionProblems";
import useTheme from "../../data/hooks/useTheme";

interface WeeklySnapshotProps {
  statistics: HomeStatistics;
  statisticDetails: {
    weeklyContestRange?: ContestIdRange;
    weeklyRatedContestRange?: ContestIdRange;
    attemptedContestRange?: ContestIdRange;
  };
  hasHandles: boolean;
  hasSubmissions: boolean;
  hasError: boolean;
  isLoading: boolean;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-GB");
}

function addContestRange(searchParams: URLSearchParams, range: ContestIdRange | undefined) {
  if (range === undefined) return;
  searchParams.set(SearchKeys.MinContestId, String(range.min));
  searchParams.set(SearchKeys.MaxContestId, String(range.max));
}

function WeeklySnapshot({
  statistics,
  statisticDetails,
  hasHandles,
  hasSubmissions,
  hasError,
  isLoading,
}: WeeklySnapshotProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const canShowStatistics = hasHandles && (!hasError || hasSubmissions);
  const unavailableValue = "—";
  const startOfWeek = getStartOfCurrentWeek();
  const startOfNextWeek = new Date(startOfWeek);
  startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);
  const weeklyDetailsParams = new URLSearchParams({
    [SearchKeys.SubmissionStatus]: Verdict.SOLVED,
    [SearchKeys.AcceptedAfter]: String(startOfWeek.getTime() / 1_000),
    [SearchKeys.AcceptedBefore]: String(startOfNextWeek.getTime() / 1_000),
    [SearchKeys.UseFilterStorage]: "false",
  });
  addContestRange(weeklyDetailsParams, statisticDetails.weeklyContestRange);
  const averageRatingDetailsParams = new URLSearchParams(weeklyDetailsParams);
  averageRatingDetailsParams.set(SearchKeys.ShowUnrated, "false");
  addContestRange(averageRatingDetailsParams, statisticDetails.weeklyRatedContestRange);
  const attemptedDetailsParams = new URLSearchParams({
    [SearchKeys.SubmissionStatus]: Verdict.ATTEMPTED,
    [SearchKeys.UseFilterStorage]: "false",
  });
  addContestRange(attemptedDetailsParams, statisticDetails.attemptedContestRange);
  const weeklyDetailsLink = `${Path.PROBLEMS}?${weeklyDetailsParams}`;
  const averageRatingDetailsLink = `${Path.PROBLEMS}?${averageRatingDetailsParams}`;
  const attemptedDetailsLink = `${Path.PROBLEMS}?${attemptedDetailsParams}`;
  const cards = [
    {
      label: "Solved this week",
      value: canShowStatistics ? formatNumber(statistics.weeklySolvedCount) : unavailableValue,
      description: "Unique accepted problems since Monday.",
      link: weeklyDetailsLink,
    },
    {
      label: "Active days",
      value: canShowStatistics ? `${formatNumber(statistics.weeklyActiveDays)} / 7` : unavailableValue,
      description: "Days with at least one accepted solution this week.",
      link: weeklyDetailsLink,
    },
    {
      label: "Average solved rating",
      value: canShowStatistics && statistics.averageSolvedRating !== null
        ? (
          <span className={theme.color(statistics.averageSolvedRating)}>
            {formatNumber(Math.round(statistics.averageSolvedRating))}
          </span>
        )
        : "—",
      description: "Average rating of rated problems solved this week.",
      link: averageRatingDetailsLink,
    },
    {
      label: "Attempted, not solved",
      value: canShowStatistics ? formatNumber(statistics.attemptedUnsolvedCount) : unavailableValue,
      description: "All-time problems still waiting for an accepted solution.",
      link: attemptedDetailsLink,
    },
  ];

  return (
    <section className="mb-5" aria-labelledby="weekly-snapshot-heading" aria-busy={isLoading}>
      <div className="d-flex align-items-end justify-content-between gap-3 mb-3">
        <div>
          <p className="home-section-kicker text-uppercase fw-semibold mb-1">Progress</p>
          <h2 className="h3 fw-bold mb-0" id="weekly-snapshot-heading">Weekly snapshot</h2>
        </div>
        <span className="home-week-label small d-none d-sm-inline">Monday to today</span>
      </div>

      <ul className="row g-3 list-unstyled mb-0">
        {cards.map((card) => (
          <li className="col-12 col-sm-6 col-xl-3" key={card.label}>
            <Card
              type={CardType.Stacked}
              title={card.label}
              content={isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                  <span className="visually-hidden">Loading</span>
                </>
              ) : card.value}
              description={card.description}
              onClick={canShowStatistics && !isLoading ? () => navigate(card.link) : undefined}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default WeeklySnapshot;
