import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import ReactGA from "react-ga4";

const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    ReactGA.initialize("G-0DNH915N52");
    ReactGA.send({ hitType: "pageview", page: location.pathname, title: location.search });
  }, [location]);
};

export default usePageTracking;
