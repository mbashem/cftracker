import { useHistory } from "react-router";
import { Path } from "../../util/constants";

const HomePage = () => {
  const history = useHistory();
  history.push(Path.CONTESTS);

  return <div className="container"></div>;
};

export default HomePage;
