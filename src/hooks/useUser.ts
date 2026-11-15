import { useLazyAuthenticateQuery, useLazyPrepareGitHubLoginQuery } from "../data/queries/userQuery";
import { beginAuthentication, errorAuthenticatingUser, removeUser } from "../data/reducers/userSlice";
import useUserStore from "../data/hooks/useUserStore";
import { useAppDispatch } from "../data/store";
import { validateSession } from "../data/actions/authentication";
import { useCallback } from "react";
import { isBackendAccessEnabled } from "../util/backendAccess";
import { BACKEND_API_URL } from "../util/env";

const failedToStartGitHubLogin = "Unable to start GitHub sign-in. This frontend may not be allowed, or the backend may be unavailable.";

function useUser() {
	const dispatch = useAppDispatch();
	const { userList } = useUserStore();
	const backendEnabled = isBackendAccessEnabled();
	const user = backendEnabled && userList.authenticationStatus === 'authenticated' ? userList.user : undefined;
	const [authenticate] = useLazyAuthenticateQuery();
	const [prepareLogin, { isFetching: isPreparingLogin }] = useLazyPrepareGitHubLoginQuery();

	const prepareGitHubLogin = useCallback(async () => {
		if (!isBackendAccessEnabled()) throw new Error("Backend features are not enabled in this browser.");
		try {
			const response = await prepareLogin(undefined, false).unwrap();
			if (response.status !== "ready") throw new Error(failedToStartGitHubLogin);
		} catch (error: unknown) {
			// Browsers hide CORS-blocked response bodies, so those need a fallback.
			const message = (error as { data?: { error?: unknown } })?.data?.error;
			throw new Error(typeof message === "string" ? message : failedToStartGitHubLogin);
		}
		return `${BACKEND_API_URL}/auth/github/login`;
	}, [prepareLogin]);

	async function handleGithubCallback(code: string, state: string) {
		if (!isBackendAccessEnabled()) throw new Error("Backend features are not enabled in this browser.");
		dispatch(beginAuthentication());
		const version = dispatch((_dispatch, getState) => getState().userList.authenticationVersion);
		const isCurrentRequest = () => dispatch((_dispatch, getState) => getState().userList.authenticationVersion) === version;
		let token: string;
		try {
			const candidate = await authenticate({ code, state }).unwrap();
			if (!isCurrentRequest()) return;
			token = candidate.jwtToken;
		} catch (err: any) {
			if (!isCurrentRequest()) return;
			console.log(err);
			let errorMessage = err?.data?.error ?? "Authentication failed!";
			dispatch(removeUser());
			dispatch(errorAuthenticatingUser({ errorMessage }));
			throw new Error(errorMessage);
		}
		const verified = await dispatch(validateSession(token));
		if (verified === false) throw new Error("Could not verify your profile. Please sign in again.");
	}

	const logout = useCallback(() => {
		dispatch(removeUser());
	}, [dispatch]);

	return { prepareGitHubLogin, handleGithubCallback, logout, user, isAuthenticated: user !== undefined, isCheckingAuthentication: backendEnabled && (userList.authenticationStatus === 'checking' || isPreparingLogin) };
}

export default useUser;
