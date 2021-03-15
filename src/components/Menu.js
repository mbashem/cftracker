import { faSync } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useHistory } from "react-router-dom";
import {
  fetchContestList,
  fetchProblemList,
  fetchSharedProblemList,
} from "../data/actions/fetchActions";
import { fetchUserSubmissions, fetchUsers } from "../data/actions/userActions";
import { PROBLEMS, CONTESTS } from "../util/constants";

const Menu = () => {
  const dispatch = useDispatch();

  let history = useHistory();
  console.log(history);

  const [handle, setHandle] = useState("");
  const state = useSelector((state) => state);

  useEffect(() => {
    console.log(state);

    fetchUserSubmissions(dispatch, state.userList.handles);
  }, [state.userList]);

  const sync = () => {
    fetchProblemList(dispatch);
    fetchUserSubmissions(dispatch, state.userList.handles);
    fetchContestList(dispatch);
    fetchSharedProblemList(dispatch);
  };

  const submitUser = () => {
    fetchUsers(dispatch, handle);
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light p-2">
      <button
        className="navbar-toggler"
        type="button"
        data-toggle="collapse"
        data-target="#navbarTogglerDemo03"
        aria-controls="navbarTogglerDemo03"
        aria-expanded="false"
        aria-label="Toggle navigation">
        <span className="navbar-toggler-icon"></span>
      </button>
      <Link to="/" className="navbar-brand" href="#">
        BashForces
      </Link>

      <div
        className="collapse navbar-collapse d-flex justify-content-end"
        id="navbarTogglerDemo03">
        <ul className="navbar-nav ml-auto mt-2 mt-lg-0">
          <li className="nav-item active">
            <a
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                sync();
              }}
              href="#">
              <FontAwesomeIcon icon={faSync} />
            </a>
          </li>
          <li className="nav-item active">
            <Link to={PROBLEMS} className="nav-link" href="#">
              Problem List
            </Link>
          </li>
          <li className="nav-item">
            <Link to={CONTESTS} className="nav-link" href="#">
              Contest
            </Link>
          </li>
        </ul>
        <form
          className="form-inline d-flex my-2 my-lg-0"
          onSubmit={(e) => {
            e.preventDefault();
            submitUser();
          }}>
          <input
            className="form-control mr-sm-2"
            type="search"
            placeholder="Handle"
            aria-label="Search"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
        </form>
      </div>
    </nav>
  );
};

export default Menu;
