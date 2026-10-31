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
import { BACKEND_API_URL, IS_BACKEND_AVAILABLE } from "../util/env";
import useToast from "../hooks/useToast";
import useUser from "../hooks/useUser";
import useUserStore from "../data/hooks/useUserStore";
import AboutMenuItem from "./common/AboutMenuItem";
import EditableText from "./common/EditableText";
import MenuItem, { type MenuItemDefinition } from "./common/MenuItem";

function Menu() {
  const { userList, updateUsers, syncUserSubmissions } = useUserStore();
  const { theme, changeThemeMod } = useTheme();
  const { isAuthenticated, isCheckingAuthentication, logout } = useUser();

  const { showGeneralToast } = useToast();

  const submitUser = useCallback((handle: string) => {
    showGeneralToast(`Handles entered: ${handle}`);
    updateUsers(handle);
  }, [showGeneralToast, updateUsers]);

  const items = useMemo<MenuItemDefinition[]>(() => [
    { id: "issues", kind: "route", label: "Issues", to: Path.Issues, active: true },
    { id: "lists", kind: "route", label: "Lists", to: Path.Lists, active: true, visible: IS_BACKEND_AVAILABLE && isAuthenticated },
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
      id: "checking-authentication", kind: "custom", visible: IS_BACKEND_AVAILABLE && isCheckingAuthentication,
      content: (
        <span className="nav-link" role="status">
          <span className="spinner-border spinner-border-sm" aria-hidden="true" />
          <span className="visually-hidden">Checking sign-in…</span>
        </span>
      ),
    },
    {
      id: "sign-out", kind: "action", label: "Sign out", icon: faRightFromBracket, onSelect: logout,
      visible: IS_BACKEND_AVAILABLE && !isCheckingAuthentication && isAuthenticated,
    },
    {
      id: "sign-in", kind: "link", label: "Sign in with GitHub", icon: faGithub,
      href: `${BACKEND_API_URL}/auth/github/login`,
      visible: IS_BACKEND_AVAILABLE && !isCheckingAuthentication && !isAuthenticated,
    },
  ], [theme, isAuthenticated, isCheckingAuthentication, changeThemeMod, syncUserSubmissions, userList.handles, submitUser, logout]);

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
