import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faMoon } from "@fortawesome/free-regular-svg-icons";
import { faInfo, faSignIn, faSignOut, faSun, faSync } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { Nav, Navbar, OverlayTrigger, Popover } from "react-bootstrap";
import { Link } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { fetchContestList, fetchProblemList, fetchSharedProblemList } from "../data/actions/fetchActions";
import { fetchUserSubmissions, fetchUsers } from "../data/actions/userActions";
import { useAppDispatch, useAppSelector } from "../data/store";
import { Path } from "../util/route/path";
import { ThemesType } from "../util/Theme";
import "react-toastify/dist/ReactToastify.css";
import siteLogo from "../util/assets/siteLogo.png";
import useTheme from "../data/hooks/useTheme";
import { GITHUB_OAUTH_CLIENT_ID, GITHUB_OAUTH_REDIRECT_URI, IS_BACKEND_AVAILABLE } from "../util/env";
import useToast from "../hooks/useToast";
import useUser from "../hooks/useUser";

const Menu = (): JSX.Element => {
  const dispatch = useAppDispatch();

  const state = useAppSelector((state) => {
    return {
      userList: state.userList,
      problemList: state.problemList,
      contestList: state.contestList,
      userSubmissions: {
        error: state.userSubmissions.error,
      },
    };
  });
  const { theme, changeThemeMod } = useTheme();
  const { isAuthenticated, logout } = useUser();

  const [handle, setHandle] = useState(state.userList.handles.length ? state.userList.handles.toString() : "");

  useEffect(() => {
    fetchProblemList(dispatch);
    fetchContestList(dispatch);
    fetchSharedProblemList(dispatch);
  }, []);

  const { showErrorToast, showGeneralToast } = useToast();

  const InvokeErrorToast = (message: string) => {
    if (message.length === 0) {
      return;
    }
    console.log(message);
    showErrorToast(message);
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
    showGeneralToast(`Handles entered: ${handle}`);
    fetchUsers(dispatch, handle);
  };

  return (
    <Navbar className={"navbar navbar-expand-lg p-2 ps-4 pe-4 " + theme.navbar} expand="md">
      <div className="container p-0">
        <Link to="/" className="navbar-brand mt-2">
          <img src={siteLogo} alt="logo" width={30} height={25} className="me-2 mb-2" />
          <span>CFTracker</span>
        </Link>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />

        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto mt-2 mt-lg-0">
            <li className="nav-item active">
              <Link to={Path.Issues} className="nav-link">
                {/* <span className="p-1">{<FontAwesomeIcon icon={faBars} />}</span> */}
                <span>Issues</span>
              </Link>
            </li>
            {IS_BACKEND_AVAILABLE && isAuthenticated && (
              <li className="nav-item active">
                <Link to={Path.Lists} className="nav-link">
                  {/* <span className="p-1">{<FontAwesomeIcon icon={faBars} />}</span> */}
                  <span>Lists</span>
                </Link>
              </li>
            )}
            <li className="nav-item active">
              <Link to={Path.PROBLEMS} className="nav-link">
                {/* <span className="p-1">{<FontAwesomeIcon icon={faBars} />}</span> */}
                <span>Problems</span>
              </Link>
            </li>
            <li className="nav-item">
              <Link to={Path.CONTESTS} className="nav-link">
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
                  <Popover id="popover-basic" className={theme.bgText}>
                    <Popover.Header as="h3" className={theme.bgText}>
                      <div className="d-flex align-items-center">
                        <span className={theme.bgText}>
                          CFTracker (Created by{" "}
                          <a href="https://codeforces.com/profile/bashem" className={" " + theme.text} target="__blank">
                            bashem
                          </a>
                          )
                        </span>
                      </div>
                    </Popover.Header>
                    <Popover.Body className={theme.bgText}>
                      <ul className="list-group list-group-flush">
                        <li className={"list-group-item " + theme.bgText}>
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
                <a href="#" onClick={(e) => e.preventDefault()} className="nav-link" title="Created by Bashem">
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
                  if (theme.themeType === ThemesType.DARK) changeThemeMod(ThemesType.LIGHT);
                  else changeThemeMod(ThemesType.DARK);
                }}
              >
                <FontAwesomeIcon icon={theme.themeType === ThemesType.DARK ? faMoon : faSun} />
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
                  className={"form-control " + theme.bgText}
                  type="text"
                  placeholder="handle1,handle2,.."
                  aria-label="handles"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                />
              </form>
            </li>

            {IS_BACKEND_AVAILABLE && isAuthenticated ? (
              <li className="nav-item">
                <a
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    logout();
                  }}
                  title="Refresh Submissions"
                  href="#"
                >
                  <FontAwesomeIcon icon={faSignOut} />
                </a>
              </li>
            ) : (
              IS_BACKEND_AVAILABLE && (
                <li className="nav-item">
                  <a
                    className="nav-link"
                    title="Refresh Submissions"
                    href={`https://github.com/login/oauth/authorize?client_id=${GITHUB_OAUTH_CLIENT_ID}&redirect_uri=${GITHUB_OAUTH_REDIRECT_URI}&scope=user:email`}
                  >
                    <FontAwesomeIcon icon={faSignIn} />
                  </a>
                </li>
              )
            )}
          </Nav>
        </Navbar.Collapse>
      </div>
      <ToastContainer />
    </Navbar>
  );
};

export default Menu;
