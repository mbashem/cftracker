import HomeHeader from "./HomeHeader";
import HomeStatus from "./HomeStatus";
import QuickActions from "./QuickActions";
import WeeklySnapshot from "./WeeklySnapshot";
import useHomePage from "./useHomePage";
import "./HomePage.css";

function HomePage() {
  const {
    theme,
    handles,
    addHandle,
    removeHandle,
    statistics,
    statisticDetails,
    hasHandles,
    hasSubmissions,
    isLoading,
    error,
  } = useHomePage();

  return (
    <main className={`home-page home-page--${theme.name} container py-3 py-lg-4`}>
      <HomeHeader handles={handles} onAddHandle={addHandle} onRemoveHandle={removeHandle} />
      <HomeStatus
        handles={handles}
        hasHandles={hasHandles}
        hasSubmissions={hasSubmissions}
        isLoading={isLoading}
        error={error}
      />
      <WeeklySnapshot
        statistics={statistics}
        statisticDetails={statisticDetails}
        hasHandles={hasHandles}
        hasSubmissions={hasSubmissions}
        hasError={error !== undefined}
        isLoading={isLoading}
      />
      <QuickActions />
    </main>
  );
}

export default HomePage;
