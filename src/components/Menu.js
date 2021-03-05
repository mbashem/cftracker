import { faSync } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  fetchContestList,
  fetchProblemList,
} from "../data/actions/fetchActions";
import { fetchUserSubmissions, fetchUsers } from "../data/actions/userActions";

export const PROBLEMS = "/problems";
export const CONTEST = "/contests";

const Menu = () => {
  const dispatch = useDispatch();

  const [handle, setHandle] = useState("");
  const state = useSelector((state) => state);

  const sync = () => {
    fetchProblemList(dispatch);
    fetchUserSubmissions(dispatch, state.userList.handles);
    fetchContestList(dispatch);
  };

  const submitUser = () => {
    fetchUsers(dispatch, handle).then(() => {
      fetchUserSubmissions(dispatch, state.userList.handles);
    });
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
            <Link to={CONTEST} className="nav-link" href="#">
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
          <button
            className="btn btn-outline-success my-2 my-sm-0"
            type="submit">
            Enter
          </button>
        </form>
      </div>
    </nav>
  );
};

export default Menu;
