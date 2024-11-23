import ContestCategoriesByACPercentage from "./charts/ContestCategoriesByACPercentage";
import RatingByACPercentage from "./charts/RatingByACPercentage";
import SolveCountByRating from "./charts/SolveCountByRating";
import SubmissionsByVerdict from "./charts/SubmissionsByVerdict";
import SubmissionsHeatMap from "./charts/SubmissionsHeatMap";
import useStatPage from "./useStatPage";

/**
 * TODO:
 * percentage of problem solved by problem index
 * percentage of problem solved by rating
 */
const StatPage = () => {
  const { problemIDsBySimpleVerdict, submissionsByVerdict } = useStatPage();

  return (
    <div className="container pb-5">
      <div className="row justify-content-center" style={{ height: "500px" }}>
        <SubmissionsByVerdict submissionsByVerdict={submissionsByVerdict} />
      </div>
      <div className="row justify-content-center mb-5 mt-5" style={{ height: "500px" }}>
        <SolveCountByRating problemIDsGroupedBySimpleVerdict={problemIDsBySimpleVerdict} />
      </div>
      <div className="row justify-content-center mb-5" style={{ height: "500px" }}>
        <RatingByACPercentage />
      </div>
      <div className="mt-5 mb-5">
        <ContestCategoriesByACPercentage />
      </div>
      <div className="row justify-content-center mt-5 w-100">
        <SubmissionsHeatMap />
      </div>
    </div>
  );
};

export default StatPage;
