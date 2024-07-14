import { useNavigate } from "react-router";
import { Path } from "../../util/constants";

const HomePage = () => {
  const navigate = useNavigate();
  navigate(Path.CONTESTS);

  return <div className="container"></div>;
};

export default HomePage;
