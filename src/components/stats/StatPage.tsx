import ContestCategoriesByACPercentage from "./charts/ContestCategoriesByACPercentage";
import RatingByACPercentage from "./charts/RatingByACPercentage";
import SolveCountByRating from "./charts/SolveCountByRating";
import SubmissionsByVerdict from "./charts/SubmissionsByVerdict";
import SubmissionsHeatMap from "./charts/SubmissionsHeatMap";
import useStatPage from "./useStatPage";

/**
 * TODO:
 * heatmap
 * percetange of problem solved by contest category
 * percentage of problem solved by problem index
 * percentage of problem solved by rating
 */
const StatPage = () => {
  const { problemIDsBySimpleVerdict, submissionsByVerdict, ratingLabels } = useStatPage();

  return (
    <div className="container pb-5">
      <SubmissionsByVerdict submissionsByVerdict={submissionsByVerdict} />
      <SolveCountByRating ratingLabels={ratingLabels} problemIDsGroupedBySimpleVerdict={problemIDsBySimpleVerdict} />
      <RatingByACPercentage ratingLabels={ratingLabels} />
      <ContestCategoriesByACPercentage />
      <SubmissionsHeatMap />
    </div>
  );
};

export default StatPage;
