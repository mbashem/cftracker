import { useEffect } from "react";
import { matchPath, useNavigate } from "react-router";
import { useLocation } from "react-router";
import useToast from "./useToast";
import { Path } from "../util/route/path";
import useUser from "./useUser";

function useCallbackHandler() {
	const { handleGithubCallback } = useUser();
	const location = useLocation();
	const { showErrorToast, showGeneralToast } = useToast();
	const navigate = useNavigate();

	useEffect(() => {
		const query = new URLSearchParams(location.search);
		const code = query.get('code');

		if (matchPath(location.pathname, "/callback/auth-gh") && code !== null) {
			showGeneralToast("Authenticating...");
			handleGithubCallback(code)
				.catch(err => showErrorToast(err?.message ?? "Authentication failed!"));
			navigate(Path.CONTESTS);
		}

	}, [location.pathname, location.search]);
}

export default useCallbackHandler;