import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faMoon } from "@fortawesome/free-regular-svg-icons";
import { faInfo, faSun, faSync } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { Nav, Navbar, OverlayTrigger, Popover, Tooltip } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
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
import "react-toastify/dist/ReactToastify.css";
import siteLogo from '../util/assets/siteLogo.png'

const Menu = (): JSX.Element => {
  const dispatch = useDispatch();

  const state: RootStateType = useSelector((state) => state) as RootStateType;

  const [handle, setHandle] = useState(
    state.userList.handles.length ? state.userList.handles.toString() : ""
  );
  console.log(state.userList.handles.toString());
  useEffect(() => {
    fetchProblemList(dispatch);
    fetchContestList(dispatch);
    fetchSharedProblemList(dispatch);
  }, []);

  const InvokeErrorToast = (message: string) => {
    if (message.length === 0) {
      return;
    }
    console.log(message);
    toast.error(message, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "dark",
    });
  };

  useEffect(() => {
    InvokeErrorToast(state.userSubmissions.error);
  }, [state.userSubmissions.error]);

  useEffect(() => {
    InvokeErrorToast(state.problemList.error);
  }, [state.problemList.error]);

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
    toast(`Handles entered: ${handle}`, {
      position: "bottom-right",
      autoClose: 500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "dark",
    });
    fetchUsers(dispatch, handle);
  };

  return (
    <Navbar
      className={
        "navbar navbar-expand-lg p-2 ps-4 pe-4 " + state.appState.theme.navbar
      }
      expand="md"
    >
      <div className="container p-0">
        <Link to="/" className="navbar-brand mt-2" href="#">
        <img src={siteLogo} alt="haule" width={30} height={25}className="me-2 mb-2" />
        CFTracker
        </Link>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />

        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto mt-2 mt-lg-0">
            <li className="nav-item active">
              <Link to={Path.Issues} className="nav-link" href="#">
                {/* <span className="p-1">{<FontAwesomeIcon icon={faBars} />}</span> */}
                <span>Issues</span>
              </Link>
            </li>
            <li className="nav-item active">
              <Link to={Path.PROBLEMS} className="nav-link" href="#">
                {/* <span className="p-1">{<FontAwesomeIcon icon={faBars} />}</span> */}
                <span>Problems</span>
              </Link>
            </li>
            <li className="nav-item">
              <Link to={Path.CONTESTS} className="nav-link" href="#">
                {/*  <span className="p-1">  {<FontAwesomeIcon icon={faListAlt} />}  </span>*/}
                <span>Contests</span>
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
                            bashem
                          </a>
                          )
                        </span>
                      </div>
                    </Popover.Header>
                    <Popover.Body className={state.appState.theme.bgText}>
                      <ul className="list-group list-group-flush">
                        <li
                          className={
                            "list-group-item " + state.appState.theme.bgText
                          }
                        >
                          <span className="pe-2">Source Code</span>
                          <a
                            href="https://github.com/mbashem/cftracker"
                            className="text-secondary pt-1 fs-5"
                            target="__blank"
                          >
                            {<FontAwesomeIcon icon={faGithub} />}
                          </a>
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
      </div>
      <ToastContainer />
    </Navbar>
  );
};

export default Menu;
