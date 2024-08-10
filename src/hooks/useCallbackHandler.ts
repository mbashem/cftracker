import { useEffect } from "react";
import { matchPath, useNavigate } from "react-router";
import { useLocation } from "react-router";
import useToast from "./useToast";
import { Path } from "../util/route/path";
import useUser from "./useUser";

function useCallbackHandler() {
	const { handleGithubCallback } = useUser();
	const location = useLocation();
	const { popErrorToast, popGeneralToast } = useToast();
	const navigate = useNavigate();

	useEffect(() => {
		const query = new URLSearchParams(location.search);
		const code = query.get('code');

		if (matchPath(location.pathname, "/callback/auth-gh") && code !== null) {
			popGeneralToast("Authenticating...");
			handleGithubCallback(code)
				.catch(err => popErrorToast(err?.message ?? "Authentication failed!"));
			navigate(Path.CONTESTS);
		}

	}, [location]);
}

export default useCallbackHandler;