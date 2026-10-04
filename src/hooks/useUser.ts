import { useLazyAuthenticateQuery } from "../data/queries/userQuery";
import { beginAuthentication, errorAuthenticatingUser, removeUser, setUser } from "../data/reducers/userSlice";
import useUserStore from "../data/hooks/useUserStore";
import { useAppDispatch } from "../data/store";
import { StorageService } from "../util/StorageService";
import { isDefined } from "../util/util";

function useUser() {
	const dispatch = useAppDispatch();
	const { userList } = useUserStore();
	const user = userList.user;
	const [authenticate] = useLazyAuthenticateQuery();

	async function handleGithubCallback(code: string, state: string) {
		dispatch(beginAuthentication());
		const version = dispatch((_dispatch, getState) => getState().userList.authenticationVersion);
		const isCurrentRequest = () => dispatch((_dispatch, getState) => getState().userList.authenticationVersion) === version;
		try {
			const user = await authenticate({ code, state }).unwrap();
			if (!isCurrentRequest()) return;
			dispatch(setUser(user));
			StorageService.setJWTToken(user.jwtToken);
			return;
		} catch (err: any) {
			if (!isCurrentRequest()) return;
			console.log(err);
			let errorMessage = err?.data?.error ?? "Authentication failed!";
			dispatch(errorAuthenticatingUser({ errorMessage }));
			throw new Error(errorMessage);
		}
	}

	function logout() {
		StorageService.removeJWTToken();
		dispatch(removeUser());
	}

	return { handleGithubCallback, logout, user, isAuthenticated: isDefined(user) };
}

export default useUser;
