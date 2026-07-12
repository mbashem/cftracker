import { useMemo } from "react";
import useContestStore from "../../../data/hooks/useContestStore";
import useSubmissionsStore from "../../../data/hooks/useSubmissionsStore";
import { ContestCat } from "../../../types/CF/Contest";
import { SimpleVerdict } from "../../../types/CF/Submission";
import DefaultValueMap from "../../../util/DefaultValueMap";
import ContestCategoryByACPercentage from "./ContestCategoryByACPercentage";

interface ContestCategoryByACPercentageProps {}
const categories = Object.values(ContestCat) as ContestCat[];

function ContestCategoriesByACPercentage({}: ContestCategoryByACPercentageProps) {
  const { rawSubmissions: submissions } = useSubmissionsStore();
  const { contests } = useContestStore();

  const contestByCategory = useMemo(() => {
    let contestByCategory = new DefaultValueMap<number, ContestCat>();

    for (let contest of contests) contestByCategory.set(contest.id, contest.category ?? ContestCat.OTHERS);

    return contestByCategory;
  }, [contests]);

  const simpleVerdictByContestCategory = useMemo(() => {
    let simpleVerdictByContestCategory = new DefaultValueMap<ContestCat, DefaultValueMap<SimpleVerdict, number>>();

    for (let submission of submissions) {
      let category = contestByCategory.getOrSet(submission.contestId, ContestCat.OTHERS);

      let prevCount = simpleVerdictByContestCategory
        .getOrSet(category, new DefaultValueMap())
        .getOrSet(submission.simpleVerdict, 0);
      simpleVerdictByContestCategory.get(category)?.set(submission.simpleVerdict, prevCount + 1);
    }

    return simpleVerdictByContestCategory;
  }, [contestByCategory, submissions]);

  const categoriesWithData = useMemo(
    () => categories.filter((category) => {
      const verdictCounts = simpleVerdictByContestCategory.get(category);
      return verdictCounts !== undefined && [...verdictCounts.values()].some((count) => count > 0);
    }),
    [simpleVerdictByContestCategory]
  );

  return (
    <div className="container">
      <div className="row text-secondary text-center w-100">
        <span className="small fw-bold">Contest Categories By AC Percentage </span>
      </div>
      <div className="row">
        {categoriesWithData.map((category) => (
          <div className="col-6 col-md-3" key={category}>
            <ContestCategoryByACPercentage
              category={category}
              simpleVerdictCounts={simpleVerdictByContestCategory.get(category)!}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default ContestCategoriesByACPercentage;
