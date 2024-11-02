import SolveCountByRating from "./charts/SolveCountByRating";
import useStatPage from "./useStatPage";

const StatPage = () => {
  const { problemIDsGroupedBySimpleVerdict, theme } = useStatPage();

  return (
    <>
      <SolveCountByRating problemIDsGroupedBySimpleVerdict={problemIDsGroupedBySimpleVerdict} />
    </>
  );
};

export default StatPage;
