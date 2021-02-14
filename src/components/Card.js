import React, { useEffect, useState } from "react";

export function IndividualProblem(params) {}

function Card(id, name) {
  const [solveCount, setSolveCount] = useState(0);

  useEffect(() => {}, []);

  return (
    <div className="card bg-light" key={id}>
      <h3 className="text-secondary">
        {id} , {name} , {solveCount}
      </h3>
    </div>
  );
}

export function problemCard(problem) {
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

export default Card;
