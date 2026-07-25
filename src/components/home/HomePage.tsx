import { useNavigate } from "react-router";
import { Path } from "../../util/route/path";
import { useEffect } from "react";

function HomePage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(Path.CONTESTS);
  }, []);

  return <div className="container"></div>;
}

export default HomePage;
