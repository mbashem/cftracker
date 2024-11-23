import { useMemo } from "react";
import useSubmissionsStore from "../../../data/hooks/useSubmissionsStore";
import CalendarHeatMap, { CalendarHeatMapDataSet } from "../../common/charts/CalendarHeatMap";

interface SubmissionsHeatMap {}

function SubmissionsHeatMap({}: SubmissionsHeatMap) {
  const { rawSubmissions: submissions } = useSubmissionsStore();

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

  function isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  return <CalendarHeatMap datasets={datasets} minimumValueForMaxColor={5} />;
}

export default SubmissionsHeatMap;
