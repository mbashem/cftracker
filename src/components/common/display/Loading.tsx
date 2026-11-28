import "./Loading.css";

function Loading() {
  return (
    <div className="d-flex justify-content-center" role="status" aria-label="three-dots-loading">
      <span className="loading-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}

export default Loading;
