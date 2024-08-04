import {
  delay,
  getUserSubmissionsURL,
  stringToArray,
} from "../../util/util";
import Submission from "../../types/Submission";
import { AppDispatch } from "../store";
import { addUser, loadingUsers } from "../reducers/userSlice";
import { addUserSubmissions, clearAllUsersSubmissions, errorFetchingUserSubmissions, loadingUserSubmissions } from "../reducers/userSubmissionsSlice";

export const fetchUsers = (dispatch: AppDispatch, handle: string) => {
  dispatch(loadingUsers());
  let currentId = Date.now();

  let handleArray: string[] = stringToArray(handle, ",").map(handle => handle.trim());
  handleArray = handleArray.filter((handle) => handle.length);

  for (let handle of handleArray) {
    if (handle.length === 0) continue;
    dispatch(addUser({ handle, id: currentId }))
  }
};

export const fetchUserSubmissions = async (
  dispatch: AppDispatch,
  handles: string[],
  wait = false
) => {
  let currentId = Date.now();
  if (handles.length === 0) {
    dispatch(clearAllUsersSubmissions());
    return;
  }

  if (wait) await delay(1000);

  let cnt = 0;

  for (let handle of handles) {
    dispatch(loadingUserSubmissions());

    if (cnt !== 0)
      await delay(1000);
    cnt++;

    fetch(getUserSubmissionsURL(handle))
      .then((res) => res.json())
      .then(
        (result) => {
          if (result.status !== "OK")
            return dispatch(errorFetchingUserSubmissions("Failed To fetch Submissions for User with handle:" + handle));

          let submissions: Submission[] = result.result;

          submissions = submissions.filter(
            (submission) => submission.contestId
          );

          return dispatch(addUserSubmissions({ result: submissions, id: currentId }));
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (_error) => {
          return dispatch(errorFetchingUserSubmissions("Failed To fetch Submissions for User:" + handle));
        }
      )
      .catch((_e) => {
        // console.log(e);
        return dispatch(errorFetchingUserSubmissions("Failed To fetch Submissions for User:" + handle));
      });
  }
};
