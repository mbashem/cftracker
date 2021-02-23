export function ContestCard(contest) {
  return (
		<div></div>
	);
}

export function ProblemCard(problem) {
  return (
    <div className="card bg-dark" key={problem.contestId + problem.index}>
      <div className="card-header d-flex justify-content-between text-light">
        <div className="id font-weight-bold">
          {problem.contestId + problem.index}
        </div>
        <div className="name">{problem.name}</div>
        <div className="rating">{problem.rating}</div>

        <div className="solvedCount">{problem.solvedCount}</div>
      </div>
    </div>
  );
}
