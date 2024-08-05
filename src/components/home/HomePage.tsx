import { useNavigate } from "react-router";
import { Path } from "../../util/constants";
import { useEffect } from "react";

const HomePage = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(Path.CONTESTS);
  }, []);

  return <div className="container"></div>;
};

export default HomePage;
