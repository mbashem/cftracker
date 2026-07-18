import { fetchUserSubmissions, fetchUsers } from "../actions/userActions";
import { useAppDispatch, useAppSelector } from "../store";

function useUserStore() {
	const dispatch = useAppDispatch();
	const userList = useAppSelector(state => state.userList);

	function updateUsers(handle: string) {
		fetchUsers(dispatch, handle);
	}

	function syncUserSubmissions(wait = false) {
		fetchUserSubmissions(dispatch, userList.handles, wait);
	}

	return { userList, updateUsers, syncUserSubmissions };
}

export default useUserStore;
