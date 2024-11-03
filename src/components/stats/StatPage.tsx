import SolveCountByRating from "./charts/SolveCountByRating";
import SubmissionsByVerdict from "./charts/SubmissionsByVerdict";
import useStatPage from "./useStatPage";

const StatPage = () => {
  const { problemIDsBySimpleVerdict, submissionsByVerdict, theme } = useStatPage();

  return (
    <div className="container">
      <SubmissionsByVerdict submissionsByVerdict={submissionsByVerdict} />
      <SolveCountByRating problemIDsGroupedBySimpleVerdict={problemIDsBySimpleVerdict} />
    </div>
  );
};

export default StatPage;
