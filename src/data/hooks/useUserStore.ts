import { addHandle as addHandleAction, removeAllHandle, removeHandle as removeHandleAction } from "../reducers/userSlice";
import { requestUserSubmissions } from "../reducers/userSubmissionsSlice";
import { useAppDispatch, useAppSelector } from "../store";
import { splitStringBySeparator } from "../../util/util";
import { useCallback } from "react";

function useUserStore() {
	const dispatch = useAppDispatch();
	const userList = useAppSelector(state => state.userList);

	const updateUsers = useCallback((handle: string) => {
		const currentId = Math.max(Date.now(), userList.id + 1);
		const handles = [...new Set(
			splitStringBySeparator(handle, ",").map(handle => handle.trim()).filter((handle) => handle.length)
		)];

		if (handles.length === 0) {
			dispatch(removeAllHandle());
			return;
		}

		for (const handle of handles)
			dispatch(addHandleAction({ handle, id: currentId }));
	}, [dispatch, userList.id]);

	const syncUserSubmissions = useCallback((wait = false) => {
		dispatch(requestUserSubmissions(userList.handles, wait));
	}, [dispatch, userList.handles]);

	function addHandle(handle: string) {
		updateUsers([...userList.handles, handle.trim()].join(","));
	}

	function removeHandle(handle: string) {
		dispatch(removeHandleAction({ handle }));
	}

	return { userList, updateUsers, addHandle, removeHandle, syncUserSubmissions };
}

export default useUserStore;
