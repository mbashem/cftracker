import HomeHeader from "./HomeHeader";
import HomeStatus from "./HomeStatus";
import QuickActions from "./QuickActions";
import Snapshot from "./Snapshot";
import useHomePage from "./useHomePage";
import "./HomePage.css";

function HomePage() {
  const {
    handles,
    addHandle,
    removeHandle,
    statistics,
    statisticDetails,
    snapshotPeriod,
    snapshotRange,
    customRange,
    setSnapshotPeriod,
    setCustomRange,
    hasHandles,
    hasSubmissions,
    isLoading,
    error,
  } = useHomePage();

  return (
    <main className="home-page container py-3 py-lg-4">
      <HomeHeader handles={handles} onAddHandle={addHandle} onRemoveHandle={removeHandle} />
      <HomeStatus
        handles={handles}
        hasHandles={hasHandles}
        hasSubmissions={hasSubmissions}
        isLoading={isLoading}
        error={error}
      />
      <Snapshot
        statistics={statistics}
        statisticDetails={statisticDetails}
        period={snapshotPeriod}
        range={snapshotRange}
        customRange={customRange}
        hasHandles={hasHandles}
        hasSubmissions={hasSubmissions}
        hasError={error !== undefined}
        isLoading={isLoading}
        onPeriodChange={setSnapshotPeriod}
        onCustomRangeChange={setCustomRange}
      />
      <QuickActions />
    </main>
  );
}

export default HomePage;
