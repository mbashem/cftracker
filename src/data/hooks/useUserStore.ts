import { addHandle, removeAllHandle } from "../reducers/userSlice";
import { requestUserSubmissions } from "../reducers/userSubmissionsSlice";
import { useAppDispatch, useAppSelector } from "../store";
import { stringToArray } from "../../util/util";

function useUserStore() {
	const dispatch = useAppDispatch();
	const userList = useAppSelector(state => state.userList);

	function updateUsers(handle: string) {
		const currentId = Date.now();
		const handles = stringToArray(handle, ",").map(handle => handle.trim()).filter((handle) => handle.length);

		if (handles.length === 0) {
			dispatch(removeAllHandle());
			return;
		}

		for (const handle of handles)
			dispatch(addHandle({ handle, id: currentId }));
	}

	function syncUserSubmissions(wait = false) {
		dispatch(requestUserSubmissions(userList.handles, wait));
	}

	return { userList, updateUsers, syncUserSubmissions };
}

export default useUserStore;
