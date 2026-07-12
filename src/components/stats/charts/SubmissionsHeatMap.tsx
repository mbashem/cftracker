import { useEffect, useMemo } from "react";
import useSubmissionsStore from "../../../data/hooks/useSubmissionsStore";
import useTheme from "../../../data/hooks/useTheme";
import usePersistentState from "../../../hooks/usePersistentState";
import { StorageService } from "../../../util/StorageService";
import CalendarHeatMap, { CalendarHeatMapDataSet } from "../../common/charts/CalendarHeatMap";

const allYears = "all";

function SubmissionsHeatMap() {
  const { rawSubmissions: submissions } = useSubmissionsStore();
  const { theme } = useTheme();
  const [selectedYear, setSelectedYear] = usePersistentState<number | typeof allYears | undefined>(
    StorageService.Keys.Stats.SubmissionHeatMapYear,
    undefined
  );

  const datasets = useMemo(() => {
    let datasets: CalendarHeatMapDataSet[] = [];
    let clonedSubmissions = [...submissions];
    clonedSubmissions.sort(
      (submission1, submission2) => submission1.creationTimeSeconds - submission2.creationTimeSeconds
    );

    for (let submission of clonedSubmissions) {
      let submissionDate = submission.submissionDate;
      if (datasets.length === 0 || datasets[datasets.length - 1].year < submissionDate.getFullYear()) {
        datasets.push({ datas: [], year: submissionDate.getFullYear() });
      }

      let index = datasets.length - 1;
      let lastElementIndex = datasets[index].datas.length - 1;

      if (lastElementIndex >= 0 && isSameDay(datasets[index].datas[lastElementIndex].date, submissionDate)) {
        datasets[index].datas[lastElementIndex].value += 1;
      } else {
        datasets[datasets.length - 1].datas.push({ date: submissionDate, value: 1 });
      }
    }

    return datasets;
  }, [submissions]);

  const years = useMemo(() => datasets.map((dataset) => dataset.year).reverse(), [datasets]);
  const activeYear = selectedYear === allYears || (selectedYear !== undefined && years.includes(selectedYear))
    ? selectedYear
    : years[0] ?? allYears;
  const visibleDatasets = useMemo(
    () => activeYear === allYears ? datasets : datasets.filter((dataset) => dataset.year === activeYear),
    [activeYear, datasets]
  );

  useEffect(() => {
    if (years.length > 0 && selectedYear !== activeYear) setSelectedYear(activeYear);
  }, [activeYear, selectedYear, setSelectedYear, years.length]);

  function isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  return (
    <div className="d-flex flex-column w-100">
      <div className="d-flex justify-content-center align-items-center gap-3 mb-4">
        <span className="text-secondary fw-bold small">Submission HeatMap</span>
        <select
          className={`form-select form-select-sm w-auto ${theme.bgText}`}
          aria-label="Select heatmap year"
          value={activeYear}
          onChange={(event) => {
            setSelectedYear(event.target.value === allYears ? allYears : Number(event.target.value));
          }}
        >
          <option value={allYears}>All</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      <CalendarHeatMap datasets={visibleDatasets} minimumValueForMaxColor={5} />
    </div>
  );
}

export default SubmissionsHeatMap;
