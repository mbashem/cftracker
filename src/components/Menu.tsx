import { faMoon } from "@fortawesome/free-regular-svg-icons";
import { faSun, faSync } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  changeAppState,
  fetchContestList,
  fetchProblemList,
  fetchSharedProblemList,
} from "../data/actions/fetchActions";
import { AppReducerType } from "../data/actions/types";
import { fetchUserSubmissions, fetchUsers } from "../data/actions/userActions";
import { RootStateType } from "../data/store";
import { PROBLEMS, CONTESTS } from "../util/constants";
import { ThemesType } from "../util/Theme";

const Menu = (): JSX.Element => {
  const dispatch = useDispatch();

  const state: RootStateType = useSelector((state) => state);

  const [handle, setHandle] = useState(
    state.userList.handles.length ? state.userList.handles.toString() : ""
  );
  console.log(state.userList.handles.toString());
  useEffect(() => {
    fetchProblemList(dispatch);
    fetchContestList(dispatch);
    fetchSharedProblemList(dispatch);
  }, []);

  useEffect(() => {
    if (!state.contestList.loading && !state.problemList.loading) sync();
  }, [state.userList]);

  useEffect(() => {
    if (!state.contestList.loading && !state.problemList.loading) sync();
    // console.log(state.contestList.loading);
    // console.log(state.problemList.loading);
  }, [state.contestList.loading, state.problemList.loading]);

  const sync = () => {
    fetchUserSubmissions(dispatch, state.userList.handles);
  };

  const submitUser = () => {
    // Notification.info({
    //   title: "User submitted!",
    //   duration: 200,
    //   description: "hh",
    // });
    // toast.error("🦄 Wow so easy!", {
    //   position: "bottom-right",
    //   autoClose: 2001,
    //   hideProgressBar: false,
    //   closeOnClick: true,
    //   pauseOnHover: true,
    //   draggable: true,
    //   progress: undefined,
    // });
    fetchUsers(dispatch, handle);
  };

  return (
    <nav
      className={
        "navbar navbar-expand-lg p-2 ps-4 pe-4 " + state.appState.theme.navbar
      }>
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
        CFTracker
      </Link>

      <div
        className="collapse navbar-collapse d-flex justify-content-end"
        id="navbarTogglerDemo03">
        <ul className="navbar-nav ml-auto mt-2 mt-lg-0">
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

          <li className="nav-item">
            <a
              className={"nav-link"}
              href="#"
              title="Change Theme"
              onClick={(e) => {
                e.preventDefault();
                if (state.appState.themeMod === ThemesType.DARK)
                  changeAppState(
                    dispatch,
                    AppReducerType.CHANGE_THEME,
                    ThemesType.LIGHT
                  );
                else
                  changeAppState(
                    dispatch,
                    AppReducerType.CHANGE_THEME,
                    ThemesType.DARK
                  );
              }}>
              <FontAwesomeIcon
                icon={
                  state.appState.themeMod === ThemesType.DARK ? faMoon : faSun
                }
              />
            </a>
          </li>

          <li className="nav-item">
            <a
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                sync();
              }}
              title="Refresh Submissions"
              href="#">
              <FontAwesomeIcon icon={faSync} />
            </a>
          </li>

          <li className="nav-item">
            <form
              className="form-inline d-flex my-2 my-lg-0 nav-item"
              onSubmit={(e) => {
                e.preventDefault();
                submitUser();
              }}>
              <input
                name="handle"
                className="form-control mr-sm-2"
                type="text"
                placeholder="handle1,handle2,.."
                aria-label="handles"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
            </form>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Menu;
