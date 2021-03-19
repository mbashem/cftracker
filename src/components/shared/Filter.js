import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getRandomInteger, parseQuery } from "../../util/bashforces";
import { sortByRating, sortBySolveCount } from "../../util/sortMethods";
import {
  SEARCH,
  PROBLEMS,
} from "../../util/constants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilter,
  faRandom,
  faRedo,
  faRedoAlt,
} from "@fortawesome/free-solid-svg-icons";
import { useHistory } from "react-router";

const Filter = (props) => {
  const state = useSelector((state) => state);
  const history = useHistory();

	let query = props.query;

  const SOLVED = 1,
    ATTEMPTED = 0,
    UNSOLVED = -1,
    SORT_BY_RATING = 1,
    SORT_BY_SOLVE = 2,
    ASCENDING = 0,
    DESCENDING = 1;

  const query = parseQuery(history.location.search.trim());

  const initFilterState = {
    solveStatus: [SOLVED, ATTEMPTED, UNSOLVED],
    rating: { min_rating: -1, max_rating: 4000 },
    tags: new Set(),
    search: SEARCH in query ? query[SEARCH] : "",
    sortBy: SORT_BY_SOLVE,
    order: DESCENDING,
    perPage: 100,
  };

  const [problemList, setProblemList] = useState({ problems: [], error: "" });
  const [tagList, setTagList] = useState({ tags: [] });
  const [randomProblem, setRandomProblem] = useState(-1);
  const [selected, setSelected] = useState(0);

  const [filterState, setFilterState] = useState(initFilterState);


  useEffect(() => {
    if (filterState.search.trim().length)
      history.push({
        pathname: PROBLEMS,
        search: "?" + SEARCH + "=" + filterState.search.trim(),
      });
    else
      history.push({
        pathname: PROBLEMS,
      });
    if (state.problemList.problems !== undefined) {
      let newState = { problems: [] };
      newState.problems = state.problemList.problems;

      newState.problems = newState.problems.filter((problem) =>
        filterProblem(problem)
      );

      if (filterState.sortBy === SORT_BY_RATING)
        newState.problems.sort(sortByRating);
      else newState.problems.sort(sortBySolveCount);
      if (filterState.order === DESCENDING) newState.problems.reverse();

      let tags = [];
      for (let tag of state.problemList.tags) tags.push(tag);
      setTagList({ tags });
      setProblemList({ ...problemList, problems: newState.problems });
    }
    setRandomProblem(-1);
    setSelected(0);
  }, [state, filterState]);

  const searchData = (e) => {
    setFilterState({ ...filterState, search: e.target.value });
  };

  const chooseRandom = () => {
    if (problemList.problems.length === 0) return;
    setRandomProblem(getRandomInteger(0, problemList.problems.length - 1));
  };

  return (
    <div>
      <div className="menu">
        <ul className="nav nav-tabs d-flex justify-content-between container border-0 mt-3">
          <li className="nav-item col-4">
            <form
              className="form-inline d-flex my-2 my-lg-0"
              onSubmit={(e) => e.preventDefault()}>
              <input
                className="form-control mr-sm-2 bg-dark text-light"
                type="text"
                placeholder="Problem Name or Id"
                aria-label="Search"
                value={filterState.search}
                onChange={(e) => {
                  setFilterState({
                    ...filterState,
                    search: e.target.value,
                  });
                }}
              />
            </form>
          </li>

          <li className="nav-item text-secondary h-6">
            Showing {paginate().length} of {problemList.problems.length}
          </li>

          <li className="nav-item">
            <div className="btn-group" role="group" aria-label="Basic example">
              <button
                type="button"
                className="btn btn-dark nav-link"
                onClick={chooseRandom}
                title="Find Random Contest"
                href="#">
                <FontAwesomeIcon icon={faRandom} />
              </button>
              <button
                type="button"
                className="btn btn-dark nav-link"
                title="Cancel Random"
                onClick={() => setRandomProblem(-1)}
                href="#">
                <FontAwesomeIcon icon={faRedo} />
              </button>
            </div>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className="btn btn-primary"
              data-bs-toggle="modal"
              data-bs-target="#exampleModal">
              {<FontAwesomeIcon icon={faFilter} />}
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
                      Filter
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      data-bs-dismiss="modal"
                      aria-label="Close"></button>
                  </div>
                  <div className="modal-body">
                    <div className="group">
                      <form
                        className="form-inline d-flex justify-content-between my-2 my-lg-0"
                        onSubmit={(e) => e.preventDefault()}>
                        <div className="d-flex justify-content-between w-100">
                          <div className="input-group">
                            <span
                              className="input-group-text"
                              id="perpage-input">
                              Per Page
                            </span>
                            <input
                              className="form-control mr-sm-2"
                              type="number"
                              aria-label="perpage"
                              aria-describedby="perpage-input"
                              value={filterState.perPage}
                              onChange={(e) =>
                                setFilterState({
                                  ...filterState,
                                  perPage: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="input-group d-flex justify-content-end">
                            <button
                              className="btn btn-light nav-link h-6"
                              onClick={() => setFilterState(initFilterState)}
                              title="Reset To Default State"
                              href="#">
                              <FontAwesomeIcon icon={faRedoAlt} />
                            </button>
                          </div>
                        </div>
                      </form>
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
                            let myFilterState = { ...filterState };
                            let ind = filterState.solveStatus.indexOf(solved);
                            if (ind != -1)
                              myFilterState.solveStatus.splice(ind, 1);
                            else myFilterState.solveStatus.push(solved);
                            setFilterState(myFilterState);
                          }}>
                          {solved === SOLVED
                            ? "Solved"
                            : solved === ATTEMPTED
                            ? "Attempted"
                            : "Unsolved"}
                        </button>
                      ))}
                    </div>
                    <form
                      className=""
                      onSubmit={(e) => {
                        e.preventDefault();
                      }}>
                      <div className="d-flex">
                        <div className="input-group pe-1">
                          <span className="input-group-text" id="perpage-input">
                            Min Rating
                          </span>
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
                        </div>
                        <div className="input-group ps-1">
                          <span className="input-group-text" id="perpage-input">
                            Max Rating
                          </span>
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
                      </div>
                    </form>
                    <div
                      className="btn-group me-2 d-flex flex-wrap"
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
                            let myFilterState = { ...filterState };
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
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Filter;