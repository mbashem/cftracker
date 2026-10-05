import "./Loading.css";

function Loading() {
  return (
    <div className="d-flex justify-content-center" role="status" aria-label="three-dots-loading">
      <svg className="loading-dots" width="80" height="80" viewBox="0 0 80 80" aria-hidden="true" focusable="false">
        <circle cx="16" cy="40" r="8" />
        <circle cx="40" cy="40" r="8" />
        <circle cx="64" cy="40" r="8" />
      </svg>
    </div>
  );
}

export default Loading;
