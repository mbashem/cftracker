import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export const PROBLEMS = "/problems";
export const CONTEST = "/contests";

const Menu = () => {
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
              <Link to={ PROBLEMS} className="nav-link" href="#">
                Problem List
              </Link>
            </li>
            <li className="nav-item">
              <Link to={ CONTEST} className="nav-link" href="#">
                Contest
              </Link>
            </li>
          </ul>
          <form className="form-inline d-flex my-2 my-lg-0">
            <input
              className="form-control mr-sm-2"
              type="search"
              placeholder="Handle"
              aria-label="Search"
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
