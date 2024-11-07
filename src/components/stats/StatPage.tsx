import RatingByACPercentage from "./charts/RatingByACPercentage";
import SolveCountByRating from "./charts/SolveCountByRating";
import SubmissionsByVerdict from "./charts/SubmissionsByVerdict";
import useStatPage from "./useStatPage";

// heatmap
// leetcode like rating/contest category by correct ac percentage
// percetange of problem solved by contest category
const StatPage = () => {
  const { problemIDsBySimpleVerdict, submissionsByVerdict, ratingLabels } = useStatPage();

  return (
    <div className="container">
      <SubmissionsByVerdict submissionsByVerdict={submissionsByVerdict} />
      <SolveCountByRating ratingLabels={ratingLabels} problemIDsGroupedBySimpleVerdict={problemIDsBySimpleVerdict} />
      <RatingByACPercentage ratingLabels={ratingLabels}/>
    </div>
  );
};

export default StatPage;
