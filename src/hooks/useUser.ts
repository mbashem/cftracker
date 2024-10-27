import { useLazyAuthenticateQuery } from "../data/queries/userQuery";
import { errorAuthenticatingUser, removeUser, setUser } from "../data/reducers/userSlice";
import { useAppDispatch, useAppSelector } from "../data/store";
import { StorageService } from "../util/StorageService";
import { isDefined } from "../util/util";

function useUser() {
	const dispatch = useAppDispatch();
	const user = useAppSelector(state => state.userList.user);
	const [authenticate] = useLazyAuthenticateQuery();

	async function handleGithubCallback(code: string) {
		try {
			const user = await authenticate({ code }).unwrap();
			dispatch(setUser(user));
			StorageService.setJWTToken(user.jwtToken);
			return;
		} catch (err: any) {
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