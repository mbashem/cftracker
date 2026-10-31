import "./App.css";
import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Routes } from "react-router";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Menu from "./components/Menu";
import { Path } from "./util/route/path";
import ContestPage from "./components/contest/ContestPage";
import useTheme from "./data/hooks/useTheme";
import AuthGuard from "./util/route/AuthGuard";
import useAppBootstrap from "./hooks/useAppBootstrap";
import Loading from "./components/common/Loading";

// Temporary development-only hold to inspect the startup animation.
const INITIAL_LOADING_DEBUG_DELAY_MS = 3000;

// const ContestPage = lazy(() => import("./components/contest/ContestPage"));
const ProblemPage = lazy(() => import("./components/problem/ProblemPage"));
const HomePage = lazy(() => import("./components/home/HomePage"));
const StatPage = lazy(() => import("./components/stats/StatPage"));
const IssuePage = lazy(() => import("./components/comment/CommentPage"));
const ListPage = lazy(() => import("./components/list/ListPage"));

function App() {
  useAppBootstrap();

  const { theme } = useTheme();
  const [isDebugLoading, setIsDebugLoading] = useState(import.meta.env.DEV);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const timeout = setTimeout(() => setIsDebugLoading(false), INITIAL_LOADING_DEBUG_DELAY_MS);
    return () => clearTimeout(timeout);
  }, []);

  const loadingIndicator = (
    <div className="d-flex justify-content-center">
      <Loading />
    </div>
  );

  return (
    <div
      className={"App container-fluid p-0 min-vh-100 d-flex  flex-column " + theme.bgText}
      data-theme={theme.name}
    >
      <div className="menu w-100">
        {" "}
        <Menu />
      </div>
      <div className="d-flex flex-column flex-grow-1 justify-content-between">
        {isDebugLoading ? loadingIndicator : <Suspense fallback={loadingIndicator}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path={Path.PROBLEMS} element={<ProblemPage key="problems" />} />
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
        </Suspense>}
      </div>
      <ToastContainer />
    </div>
  );
}

export default App;
