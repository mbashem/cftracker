import { useLazyAuthenticateQuery } from "../data/queries/userQuery";
import { beginAuthentication, errorAuthenticatingUser, removeUser } from "../data/reducers/userSlice";
import useUserStore from "../data/hooks/useUserStore";
import { useAppDispatch } from "../data/store";
import { validateSession } from "../data/actions/authentication";
import { useCallback } from "react";

function useUser() {
	const dispatch = useAppDispatch();
	const { userList } = useUserStore();
	const user = userList.authenticationStatus === 'authenticated' ? userList.user : undefined;
	const [authenticate] = useLazyAuthenticateQuery();

	async function handleGithubCallback(code: string, state: string) {
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

	return { handleGithubCallback, logout, user, isAuthenticated: user !== undefined, isCheckingAuthentication: userList.authenticationStatus === 'checking' };
}

export default useUser;
