import "./App.css";
import { lazy, Suspense, useEffect } from "react";
import { Route, Routes } from "react-router-dom";

import Menu from "./components/Menu";
import { Path } from "./util/constants";
import { ThemesType } from "./util/Theme";
import HomePage from "./components/home/HomePage";
import ProblemPage from "./components/problem/ProblemPage";
import ContestPage from "./components/contest/ContestPage";
import usePageTracking from "./usePageTracking";
import useTheme from "./data/hooks/useTheme";

// const HomePage = lazy(() => import("./components/home/HomePage"));
// const ProblemPage = lazy(() => import("./components/problem/ProblemPage"));
// const ContestPage = lazy(() => import("./components/contest/ContestPage"));
const StatPage = lazy(() => import("./components/stats/StatPage"));
const IssuePage = lazy(() => import("./components/comment/CommentPage"));

function App() {
  const { theme } = useTheme();

  usePageTracking();

  useEffect(() => {
    console.log(window.location.pathname);

    if (theme.themeType === ThemesType.DARK) {
      document.body.classList.add("bg-dark");
      document.body.classList.remove("bg-light");
    } else {
      document.body.classList.add("bg-light");
      document.body.classList.remove("bg-dark");
    }
  }, []);

  useEffect(() => {
    if (theme.themeType === ThemesType.DARK) {
      document.body.classList.add("bg-dark");
      document.body.classList.remove("bg-light");
    } else {
      document.body.classList.add("bg-light");
      document.body.classList.remove("bg-dark");
    }
  }, [theme.themeType]);

  return (
    <div className={"App container-fluid p-0 min-vh-100 d-flex  flex-column " + theme.bgText}>
      <div className="menu w-100">
        <Menu />
      </div>
      <div className="d-flex flex-column justify-content-between" style={{ minHeight: "calc(100vh - 60px)" }}>
        <Suspense
          fallback={
            <div className="d-flex justify-content-center pt-5 mt-5">
              <div className="spinner-border text-secondary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path={Path.PROBLEMS} element={<ProblemPage />} />
            <Route path={Path.CONTESTS} element={<ContestPage />} />
            <Route path={Path.Stats} element={<StatPage />} />
            <Route path={Path.Issues} element={<IssuePage />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

export default App;
