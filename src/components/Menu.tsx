import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faMoon } from "@fortawesome/free-regular-svg-icons";
import {
  faRightFromBracket,
  faSun,
  faSync,
} from "@fortawesome/free-solid-svg-icons";
import { memo, useCallback, useMemo } from "react";
import { Nav, Navbar } from "react-bootstrap";
import { Link } from "react-router";
import { Path } from "../util/route/path";
import { ThemesType } from "../util/Theme";
import siteLogo from "../util/assets/siteLogo.png";
import useTheme from "../data/hooks/useTheme";
import { navigateToExternalURL } from "../util/util";
import { isBackendAccessEnabled } from "../util/backendAccess";
import useToast from "../hooks/useToast";
import useUser from "../hooks/useUser";
import useUserStore from "../data/hooks/useUserStore";
import AboutMenuItem from "./common/navigation/AboutMenuItem";
import EditableText from "./common/forms/EditableText";
import MenuItem, { type MenuItemDefinition } from "./common/navigation/MenuItem";

function Menu() {
  const { userList, updateUsers, syncUserSubmissions } = useUserStore();
  const { theme, changeThemeMod } = useTheme();
  const { isAuthenticated, isCheckingAuthentication, logout, prepareGitHubLogin } = useUser();
  const backendEnabled = isBackendAccessEnabled();

  const { showGeneralToast, showErrorToast } = useToast();

  /** Start OAuth after access validation; surface rejected or unavailable backends in the current page. */
  const signInWithGitHub = useCallback(async () => {
    try {
      const loginURL = await prepareGitHubLogin();
      navigateToExternalURL(loginURL, window.location);
    } catch (error: unknown) {
      showErrorToast(error instanceof Error ? error.message : "Unable to start GitHub sign-in.");
    }
  }, [prepareGitHubLogin, showErrorToast]);

  const submitUser = useCallback((handle: string) => {
    showGeneralToast(`Handles entered: ${handle}`);
    updateUsers(handle);
  }, [showGeneralToast, updateUsers]);

  const items = useMemo<MenuItemDefinition[]>(() => [
    { id: "issues", kind: "route", label: "Issues", to: Path.Issues, active: true },
    { id: "lists", kind: "route", label: "Lists", to: Path.Lists, active: true, visible: backendEnabled && isAuthenticated },
    { id: "stats", kind: "route", label: "Stats", to: Path.Stats, active: true },
    { id: "problems", kind: "route", label: "Problems", to: Path.PROBLEMS, active: true },
    { id: "contests", kind: "route", label: "Contests", to: Path.CONTESTS },
    {
      id: "about", kind: "custom", content: (
        <AboutMenuItem theme={theme} />
      ),
    },
    {
      id: "theme", kind: "action", label: "Change Theme",
      icon: theme.themeType === ThemesType.DARK ? faMoon : faSun,
      onSelect: () => changeThemeMod(theme.themeType === ThemesType.DARK ? ThemesType.LIGHT : ThemesType.DARK),
    },
    { id: "refresh", kind: "action", label: "Refresh Submissions", icon: faSync, onSelect: () => syncUserSubmissions() },
    {
      id: "handles", kind: "custom", content: (
        <EditableText
          value={userList.handles.join(",")}
          displayValue={userList.handles
            .map((handle) => handle.startsWith("@") ? handle : `@${handle}`)
            .join(", ")}
          label="Handles"
          placeholder="handle1,handle2,.."
          formClassName="form-inline d-flex my-2 my-lg-0 nav-item"
          inputClassName={theme.bgText}
          viewClassName="my-2 my-lg-0"
          viewVariant="inverse"
          editTitle="Click to edit handles"
          onSubmit={submitUser}
        />
      ),
    },
    {
      id: "checking-authentication", kind: "custom", visible: backendEnabled && isCheckingAuthentication,
      content: (
        <span className="nav-link" role="status">
          <span className="spinner-border spinner-border-sm" aria-hidden="true" />
          <span className="visually-hidden">Checking sign-in…</span>
        </span>
      ),
    },
    {
      id: "sign-out", kind: "action", label: "Sign out", icon: faRightFromBracket, onSelect: logout,
      visible: backendEnabled && !isCheckingAuthentication && isAuthenticated,
    },
    {
      id: "sign-in", kind: "action", label: "Sign in with GitHub", icon: faGithub,
      onSelect: () => { void signInWithGitHub(); },
      visible: backendEnabled && !isCheckingAuthentication && !isAuthenticated,
    },
  ], [theme, backendEnabled, isAuthenticated, isCheckingAuthentication, changeThemeMod, syncUserSubmissions, userList.handles, submitUser, logout, signInWithGitHub]);

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
            {items.filter((item) => item.visible !== false).map((item) => <MenuItem key={item.id} item={item} />)}
          </Nav>
        </Navbar.Collapse>
      </div>
    </Navbar>
  );
}

export default memo(Menu);
