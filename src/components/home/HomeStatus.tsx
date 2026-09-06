interface HomeStatusProps {
  handles: readonly string[];
  hasHandles: boolean;
  hasSubmissions: boolean;
  isLoading: boolean;
  error: string | undefined;
}

function trackedHandleText(handles: readonly string[]) {
  if (handles.length === 1) return `@${handles[0].replace(/^@/, "")}`;
  return "the selected handles";
}

function HomeStatus({ handles, hasHandles, hasSubmissions, isLoading, error }: HomeStatusProps) {
  if (!hasHandles) {
    return (
      <div className="home-status rounded-3 mb-4" role="status">
        <strong>Add a handle to unlock your snapshot.</strong>{" "}
        Enter a Codeforces handle below, or add several from the navigation bar.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="home-status rounded-3 mb-4 d-flex align-items-center gap-2" role="status" aria-live="polite">
        <span className="spinner-border spinner-border-sm" aria-hidden="true" />
        <span>Loading submissions for {trackedHandleText(handles)}…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-status home-status--error rounded-3 mb-4" role="alert">
        <strong>We could not load all submission data.</strong>{" "}
        <span>{error}</span>
      </div>
    );
  }

  if (!hasSubmissions) {
    return (
      <div className="home-status rounded-3 mb-4" role="status">
        <strong>No submissions found for {trackedHandleText(handles)}.</strong>{" "}
        Check the handle spelling or refresh submissions below.
      </div>
    );
  }

  return null;
}

export default HomeStatus;
