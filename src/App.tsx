import "./App.css";
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import Menu from "./components/Menu";
import { Path } from "./util/route/path";
import HomePage from "./components/home/HomePage";
import ProblemPage from "./components/problem/ProblemPage";
import ContestPage from "./components/contest/ContestPage";
import useTheme from "./data/hooks/useTheme";
import AuthGuard from "./util/route/AuthGuard";
import useAppBootstrap from "./hooks/useAppBootstrap";

// const HomePage = lazy(() => import("./components/home/HomePage"));
// const ProblemPage = lazy(() => import("./components/problem/ProblemPage"));
// const ContestPage = lazy(() => import("./components/contest/ContestPage"));
const StatPage = lazy(() => import("./components/stats/StatPage"));
const IssuePage = lazy(() => import("./components/comment/CommentPage"));
const ListPage = lazy(() => import("./components/list/ListPage"));

function App() {
  useAppBootstrap();

  const { theme } = useTheme();

  return (
    <div className={"App container-fluid p-0 min-vh-100 d-flex  flex-column " + theme.bgText}>
      <div className="menu w-100">
        {" "}
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
            <Route
              path={Path.Lists}
              element={
                <AuthGuard>
                  <ListPage />
                </AuthGuard>
              }
            />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

export default App;
