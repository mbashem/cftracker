import { faMoon } from "@fortawesome/free-regular-svg-icons";
import { faInfo, faSun, faSync } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "@restart/ui/esm/Button";
import { useEffect, useState } from "react";
import { Nav, Navbar, OverlayTrigger, Popover, Tooltip } from "react-bootstrap";
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
import { Path } from "../util/constants";
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

  // useEffect(() => {
  //   if (!state.contestList.loading && !state.problemList.loading) sync(true);
  // }, [state.userList]);

  useEffect(() => {
    if (!state.contestList.loading && !state.problemList.loading)
      sync(state.userList.handles.length > 2 ? true : false);
    // console.log(state.contestList.loading);
    // console.log(state.problemList.loading);
  }, [state.userList, state.contestList.loading, state.problemList.loading]);

  const sync = (wait = false) => {
    fetchUserSubmissions(dispatch, state.userList.handles, wait);
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
    <Navbar
      className={
        "navbar navbar-expand-lg p-2 ps-4 pe-4 " + state.appState.theme.navbar
      }
      expand="md"
    >
      <Link to="/" className="navbar-brand" href="#">
        CFTracker
      </Link>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />

      <Navbar.Collapse
        className="d-flex justify-content-end"
        id="basic-navbar-nav"
      >
        <Nav className="ml-auto mt-2 mt-lg-0">
          <li className="nav-item active">
            <Link to={Path.Stats} className="nav-link" href="#">
              Stats
            </Link>
          </li>
          <li className="nav-item active">
            <Link to={Path.PROBLEMS} className="nav-link" href="#">
              Problem List
            </Link>
          </li>
          <li className="nav-item">
            <Link to={Path.CONTESTS} className="nav-link" href="#">
              Contest
            </Link>
          </li>

          <li className="nav-item">
            <OverlayTrigger
              trigger="click"
              placement="bottom"
              key="bottom"
              overlay={
                <Popover
                  id="popover-basic"
                  className={state.appState.theme.bgText}
                >
                  <Popover.Header
                    as="h3"
                    className={state.appState.theme.bgText}
                  >
                    <div className="d-flex align-items-center">
                      <span className={state.appState.theme.bgText}>
                        CFTracker (Created by{" "}
                        <a
                          href="https://codeforces.com/profile/bashem"
                          className={" " + state.appState.theme.text}
                          target="__blank"
                        >
                          Bashem
                        </a>
                        )
                      </span>
                    </div>
                  </Popover.Header>
                  <Popover.Body className={state.appState.theme.bgText}>
                    <ul>
                      <li>
                        On Contest Page To see rating hover over problem Name
                      </li>
                    </ul>
                  </Popover.Body>
                </Popover>
              }
            >
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="nav-link"
                title="Created by Bashem"
              >
                <FontAwesomeIcon icon={faInfo} />
              </a>
            </OverlayTrigger>
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
              }}
            >
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
              href="#"
            >
              <FontAwesomeIcon icon={faSync} />
            </a>
          </li>

          <li className="nav-item">
            <form
              className="form-inline d-flex my-2 my-lg-0 nav-item"
              onSubmit={(e) => {
                e.preventDefault();
                submitUser();
              }}
            >
              <input
                name="handle"
                className={"form-control " + state.appState.theme.bgText}
                type="text"
                placeholder="handle1,handle2,.."
                aria-label="handles"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
            </form>
          </li>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
};

export default Menu;
