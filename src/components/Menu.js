import React, { useEffect, useState } from "react";

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
      <a className="navbar-brand" href="#">
        BashForces
      </a>

      <div className="collapse navbar-collapse d-flex justify-content-end" id="navbarTogglerDemo03">
        <ul className="navbar-nav ml-auto mt-2 mt-lg-0">
          <li className="nav-item active">
            <a className="nav-link" href="#">
              Problem List
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="#">
              Contest
            </a>
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
