import { useMemo } from "react";
import useContestStore from "../../../data/hooks/useContestStore";
import useSubmissionsStore from "../../../data/hooks/useSubmissionsStore";
import { ContestCat } from "../../../types/CF/Contest";
import { SimpleVerdict } from "../../../types/CF/Submission";
import DefaultValueMap from "../../../util/DefaultValueMap";
import ContestCategoryByACPercentage from "./ContestCategoryByACPercentage";

interface ContestCategoryByACPercentageProps {}

function ContestCategoriesByACPercentage({}: ContestCategoryByACPercentageProps) {
  const { rawSubmissions: submissions } = useSubmissionsStore();
  const { contests } = useContestStore();

  const categories = Object.values(ContestCat) as ContestCat[];

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

  return (
    <div className="container">
      <div className="row text-secondary text-center w-100">
        <span className="small fw-bold">Contest Categories By AC Percentage </span>
      </div>
      <div className="row">
        {categories.map((category) => (
          <div className="col-6 col-md-3" key={category}>
            <ContestCategoryByACPercentage
              category={category}
              simpleVerdictCounts={simpleVerdictByContestCategory.get(category) ?? new DefaultValueMap()}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default ContestCategoriesByACPercentage;
