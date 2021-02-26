import React, { useEffect, useState } from "react";
import { connect, useSelector } from "react-redux";
import {
  getRandomInteger,
  getProblemUrl,
  getLocalStorage,
  setLocalStorage,
} from "../../util/bashforces";
import Fuse from "fuse.js";
import { sortByRating, sortBySolveCount } from "../../util/sortMethods";
import {
  ATTEMPTED_PROBLEMS,
  SOLVED_PROBLEMS,
} from "../../data/reducers/fetchReducers";
import Pagination from "../Pagination";
import ProblemList from "./ProblemList";

const ProblemPage = () => {
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
    perPage: 100,
  };

  const [problemList, setProblemList] = useState({ problems: [], error: "" });
  const [tagList, setTagList] = useState({ tags: [] });
  const [randomProblem, setRandomProblem] = useState(-1);
  const [selected, setSelected] = useState(0);

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

    return solveStatus && ratingInside && containTags;
  };

  useEffect(() => {
    console.log(filterState);
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
      console.log(tags);
      setProblemList({ ...problemList, problems: newState.problems });
    }
    setRandomProblem(-1);
  }, [state, filterState]);

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
  };

  const getState = (problem) => {
    if (state.userSubmissions[SOLVED_PROBLEMS].has(problem.id)) return SOLVED;
    if (state.userSubmissions[ATTEMPTED_PROBLEMS].has(problem.id))
      return ATTEMPTED;
    return UNSOLVED;
  };

  const searchData = (e) => {
    setFilterState({ ...filterState, search: e.target.value });
  };

  const chooseRandom = () => {
    if (problemList.problems.length === 0) return;
    setRandomProblem(getRandomInteger(0, problemList.problems.length - 1));
  };

  const paginate = () => {
    let lo = selected * filterState.perPage;
    let high = Math.min(
      problemList.problems.length - 1,
      lo + filterState.perPage - 1
    );

    if (lo > high) return [];
    return problemList.problems.slice(lo, high);
  };

  return (
    <div>
      <div className="menu">
        <ul className="nav nav-tabs">
          <form
            className="form-inline d-flex my-2 my-lg-0"
            onSubmit={(e) => e.preventDefault()}>
            <input
              className="form-control mr-sm-2"
              type="number"
              aria-label="Search"
              value={filterState.perPage}
              onChange={searchData}
            />
          </form>

          <li className="nav-item">
            <a className="nav-link" onClick={chooseRandom} href="#">
              Random
            </a>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className="btn btn-primary"
              data-bs-toggle="modal"
              data-bs-target="#exampleModal">
              Filter
            </button>
            <div
              className="modal"
              id="exampleModal"
              tabIndex="-1"
              aria-labelledby="exampleModalLabel"
              aria-hidden="true">
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title" id="exampleModalLabel">
                      Modal title
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      data-bs-dismiss="modal"
                      aria-label="Close"></button>
                  </div>
                  <div className="modal-body">
                    <form
                      className=""
                      onSubmit={(e) => {
                        e.preventDefault();
                      }}>
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
                    </form>
                    <div
                      className="btn-group me-2 d-flex flex-wrap"
                      role="group"
                      aria-label="First group">
                      {tagList.tags.map((tag) => (
                        <button
                          className={ (
                              (filterState.tags.has(tag)
                                ? "btn bg-success"
                                : "btn bg-dark") + " h-6 m-1 p-1 text-light"
                            )}
                          key={tag}
                          onClick={() => {
                            let myFilterState = filterState;
                            if (filterState.tags.has(tag))
                              myFilterState.tags.delete(tag);
                            else myFilterState.tags.add(tag);
                            console.log(myFilterState);
                            setFilterState(myFilterState);
                          }}>
                          {tag}
                        </button>
                      ))}
                    </div>

                    <div
                        className="btn-group me-2 d-flex flex-wrap"
                        role="group"
                        aria-label="First group">
                        {initFilterState.solveStatus.map((solved) => (
                          <button
                            className={
                              (filterState.solveStatus.includes(solved)
                                ? "btn bg-success"
                                : "btn bg-dark") + " h-6 m-1 p-1 text-light"
                            }
                            key={solved}
                            onClick={() => {
                              let myFilterState = filterState;
                              let ind = filterState.solveStatus.indexOf(solved);
                              if (ind != -1)
                                myFilterState.solveStatus.splice(ind, 1);
                              else myFilterState.solveStatus.push(solved);
                              setFilterState(myFilterState);
                              console.log(filterState);
                            }}>
                            {solved == SOLVED
                              ? "Solved"
                              : solved == ATTEMPTED
                              ? "Attempted"
                              : "Unsolved"}
                          </button>
                        ))}
                      </div>
                  </div>
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
                onChange={(e) =>
                  setFilterState({ ...filterState, search: e.target.value })
                }
              />
            </form>
          </li>
        </ul>
      </div>
      <Pagination
        totalCount={problemList.problems.length}
        perPage={filterState.perPage}
        selected={selected}
        pageSelected={(e) => setSelected(e)}
      />
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
          {randomProblem === -1 ? (
            <ProblemList problems={paginate()} />
          ) : (
            <ProblemList problems={[problemList.problems[randomProblem]]} />
          )}
        </tbody>
      </table>
      <Pagination
        totalCount={problemList.problems.length}
        perPage={filterState.perPage}
        selected={selected}
        pageSelected={(e) => setSelected(e)}
      />
    </div>
  );
};

export default ProblemPage;
