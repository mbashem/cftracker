import React, { useEffect, useState } from "react";
import { connect, useSelector } from "react-redux";
import {
  getRandomInteger,
  getProblemUrl,
  getLocalStorage,
  setLocalStorage,
} from "../util/bashforces";
import { ProblemCard } from "../util/components/Cards";
import Fuse from "fuse.js";
import { sortByRating, sortBySolveCount } from "../util/sortMethods";
import { PROBLEM_FILTER } from "../util/constants";

export function ProblemList() {
  const state = useSelector((state) => state);

  const SOLVED = 1,
    ATTEMPTED = 0,
    UNSOLVED = -1,
    SORT_BY_RATING = 1,
    SORT_BY_SOLVE = 2,
    ASCENDING = 0,
    DESCENDING = 1;
  const initFilterState = {
    solveStatus: [SOLVED, ATTEMPTED, UNSOLVED],
    rating: { min_rating: -1, max_rating: 4000 },
    tags: new Set(),
    search: "",
    sortyBy: SORT_BY_SOLVE,
    order: DESCENDING,
  };

  const [problemList, setProblemList] = useState({ problems: [], error: "" });
  const [tagList, setTagList] = useState({ tags: [] });
  const [randomProblem, setRandomProblem] = useState(-1);
  const [reload, setReload] = useState(false);
  // const [filterState, setFilterState] = useState(
  //   getLocalStorage(PROBLEM_FILTER) !== null
  //     ? { ...initFilterState, ...getLocalStorage(PROBLEM_FILTER) }
  //     : initFilterState
  // );

  const [filterState, setFilterState] = useState(initFilterState);

  const filterProblem = (problem) => {
    let containTags = false;

    if (filterState.tags.size === 0) containTags = true;
    else
      for (let tag of problem.tags)
        if (filterState.tags.has(tag)) {
          containTags = true;
          break;
        }
    let ratingInside =
      problem.rating <= filterState.rating.max_rating &&
      problem.rating >= filterState.rating.min_rating;
    let solveStatus = filterState.solveStatus.includes(getState(problem));

    let searchInside = true;
    // filterState.search.trim().length !== 0
    //   ? new Fuse([problem], { keys: ["name", "id"], distance: 2 }).search(
    //       filterState.search
    //     ).length !== 0
    //   : true;

    return solveStatus && ratingInside && containTags && searchInside;
  };

  useEffect(() => {
    console.log(filterState);
    //setLocalStorage(PROBLEM_FILTER, filterState);
    if (state.problemList.problems !== undefined) {
      let newState = { problems: [] };
      if (filterState.search.trim().length !== 0) {
        newState.problems = new Fuse(state.problemList.problems, {
          keys: ["name", "id"],
          distance: 1,
          ignoreLocation: true,
          threshold: 0.3,
          shouldSort: false,
        }).search(filterState.search);
        newState.problems = newState.problems.map((element) => element.item);
      } else newState.problems = state.problemList.problems;

      newState.problems = newState.problems.filter((problem) =>
        filterProblem(problem)
      );

      if (filterState.sortyBy === SORT_BY_RATING)
        newState.problems.sort(sortByRating);
      else newState.problems.sort(sortBySolveCount);
      if (filterState.order == DESCENDING) newState.problems.reverse();

      let tags = [];
      console.log(state.problemList);
      for (let tag of state.problemList.tags) tags.push(tag);
      setTagList({ tags });
      setProblemList({ ...problemList, problems: newState.problems });
    }
    setRandomProblem(-1);
  }, [state, reload]);

  const sortList = (sortBy) => {
    if (filterState.sortyBy === sortBy)
      setFilterState({ ...filterState, order: filterState.order ^ 1 });
    else
      setFilterState({
        ...filterState,
        ...{
          order: sortBy === SORT_BY_RATING ? ASCENDING : DESCENDING,
          sortyBy: sortBy,
        },
      });
    setReload(reload ^ true);
  };

  const getState = (problem) => {
    if (state.userSubmissions.solvedProblems.has(problem.id)) return SOLVED;
    if (state.userSubmissions.attemptedProblems.has(problem.id))
      return ATTEMPTED;
    return UNSOLVED;
  };

  const filterBySolveState = (solveStatus) => {
    setFilterState({ ...filterState, solveStatus });
  };

  const searchData = (e) => {
    // e.preventDefault();
    setFilterState({ ...filterState, search: e.target.value });
    //console.log(problemList);
  };

  const ProblemCard = (problem) => {
    let classes = "bg-dark";
    let problemState = getState(problem);
    if (problemState === 1) classes = "bg-success";
    else if (problemState === 0) classes = "bg-danger";
    return (
      <tr key={problem.id}>
        <td className={"id font-weight-bold " + classes}>{problem.id}</td>
        <td className={"name " + classes}>
          <a
            className="text-light text-decoration-none"
            target="_blank"
            href={getProblemUrl(problem.contestId, problem.index)}>
            {problem.name}
          </a>
        </td>
        <td className={"rating " + classes}>{problem.rating}</td>

        <td className={"solvedCount " + classes}>{problem.solvedCount}</td>
      </tr>
    );
  };

  const chooseRandom = () => {
    if (problemList.problems.length === 0) return;
    setRandomProblem(getRandomInteger(0, problemList.problems.length - 1));
  };

  console.log(tagList);

  return (
    <div>
      <div className="menu">
        <ul className="nav nav-tabs">
          {/* <!-- Example single danger button --> */}

          <div className="btn-group m-2">
            <button
              type="button"
              className="btn btn-secondary dropdown-toggle"
              data-bs-toggle="dropdown"
              aria-expanded="false">
              Solve State
            </button>
            <ul className="dropdown-menu">
              <li>
                <a
                  className="dropdown-item"
                  onClick={() => filterBySolveState([ATTEMPTED, UNSOLVED])}
                  href="#">
                  Unsolved
                </a>
              </li>
              <li>
                <a
                  className="dropdown-item"
                  onClick={() => filterBySolveState([UNSOLVED])}
                  href="#">
                  Never Attempted
                </a>
              </li>
              <li>
                <a
                  className="dropdown-item"
                  onClick={() =>
                    filterBySolveState([SOLVED, ATTEMPTED, UNSOLVED])
                  }
                  href="#">
                  All
                </a>
              </li>
            </ul>
          </div>

          <li className="nav-item">
            <a className="nav-link" onClick={chooseRandom} href="#">
              Random
            </a>
          </li>
          <li className="nav-item">
            <button
              type="button"
              class="btn btn-primary"
              data-bs-toggle="modal"
              data-bs-target="#exampleModal">
              Filter
            </button>
            <div
              class="modal"
              id="exampleModal"
              tabIndex="-1"
              aria-labelledby="exampleModalLabel"
              aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <form
                    className=""
                    onSubmit={(e) => {
                      e.preventDefault();
                      setReload(reload ^ 1);
                    }}
                    id="form1">
                    <div class="modal-header">
                      <h5 class="modal-title" id="exampleModalLabel">
                        Modal title
                      </h5>
                      <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                      <div className="d-flex">
                        <input
                          className="form-control mr-sm-2"
                          type="text"
                          placeholder="Min Rating"
                          value={filterState.rating.min_rating}
                          onChange={(e) =>
                            setFilterState({
                              ...filterState,
                              rating: {
                                ...filterState.rating,
                                min_rating: e.target.value,
                              },
                            })
                          }
                        />
                        <input
                          className="form-control mr-sm-2"
                          type="text"
                          placeholder="Max Rating"
                          value={filterState.rating.max_rating}
                          onChange={searchData}
                          onChange={(e) =>
                            setFilterState({
                              ...filterState,
                              rating: {
                                ...filterState.rating,
                                max_rating: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div
                        class="btn-group me-2 d-flex flex-wrap"
                        role="group"
                        aria-label="First group">
                        {tagList.tags.map((tag) => (
                          <button
                            className={
                              (filterState.tags.has(tag)
                                ? "btn bg-success"
                                : "btn bg-dark") + " h-6 m-1 p-1 text-light"
                            }
                            key={tag}
                            onClick={() => {
                              let myFilterState = filterState;
                              if (filterState.tags.has(tag))
                                myFilterState.tags.delete(tag);
                              else myFilterState.tags.add(tag);
                              setFilterState(myFilterState);
                            }}>
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button
                        type="submit"
                        form="form1"
                        class="btn btn-secondary"
                        data-bs-dismiss="modal">
                        Close
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </li>
          <li className="nav-item"></li>
          <li className="nav-item">
            <form
              className="form-inline d-flex my-2 my-lg-0"
              onSubmit={(e) => e.preventDefault()}>
              <input
                className="form-control mr-sm-2"
                type="text"
                placeholder="Problem Name or Id"
                aria-label="Search"
                value={filterState.search}
                onChange={searchData}
              />
            </form>
          </li>
        </ul>
      </div>
      <div className="problems"></div>
      <table className="table table-bordered table-dark">
        <thead className="thead-dark">
          <tr>
            <th scope="col">Problem Id</th>
            <th scope="col">Name</th>
            <th
              scope="col"
              role="button"
              onClick={() => sortList(SORT_BY_RATING)}>
              Rating
            </th>
            <th
              scope="col"
              role="button"
              onClick={() => sortList(SORT_BY_SOLVE)}>
              Solve Count
            </th>
          </tr>
        </thead>
        <tbody>
          {randomProblem === -1
            ? problemList.problems.map((problem) => {
                return ProblemCard(problem);
              })
            : ProblemCard(problemList.problems[randomProblem])}
        </tbody>
      </table>
    </div>
  );
}

//export default connect(mapStateToProps, mapDispatchToProps)(ProblemList);
export default ProblemList;
