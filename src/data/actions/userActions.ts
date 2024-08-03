import {
  delay,
  getUserSubmissionsURL,
  stringToArray,
} from "../../util/util";
import Submission from "../../util/DataTypes/Submission";
import { AppDispatch } from "../store";
import {
  ADD_USER,
  CLEAR_USERS,
  LOADING_USERS,
  ERROR_FETCHING_USER_SUBMISSIONS,
  FETCH_USER_SUBMISSIONS,
  LOADING_USER_SUBMISSIONS,
  CLEAR_USERS_SUBMISSIONS,
} from "./types";

const createDispatch = (type: any, message: any) => {
  return {
    type: type,
    payload: message,
  };
};

const load = (type: string) => {
  return { type: type };
};

export const clearUsers = (dispatch: AppDispatch) =>
  new Promise<void>((resolve, _reject) => {
    dispatch({
      type: CLEAR_USERS,
    });
    resolve();
  });

export const fetchUsers = (dispatch: AppDispatch, handle: string) => {
  dispatch(load(LOADING_USERS));
  let currentId = Date.now();

  let handleArray: string[] = stringToArray(handle, ",").map(handle => handle.trim());
  handleArray = handleArray.filter((handle) => handle.length);

  for (let handle of handleArray) {
    if (handle.length === 0) continue;
    dispatch({ type: ADD_USER, payload: { handle, id: currentId } });
  }
};

export const clearUsersSubmissions = (dispatch: AppDispatch) => {
  dispatch({
    type: CLEAR_USERS_SUBMISSIONS,
  });
};

export const fetchUserSubmissions = async (
  dispatch: AppDispatch,
  handles: string[],
  wait = false
) => {
  let currentId = Date.now();
  if (handles.length === 0) {
    clearUsersSubmissions(dispatch);
    return;
  }

  if (wait) await delay(1000);

  let cnt = 0;

  for (let handle of handles) {
    dispatch(load(LOADING_USER_SUBMISSIONS));

    if (cnt !== 0)
      await delay(1000);
    cnt++;

    fetch(getUserSubmissionsURL(handle))
      .then((res) => res.json())
      .then(
        (result) => {
          if (result.status !== "OK")
            return dispatch(
              createDispatch(
                ERROR_FETCHING_USER_SUBMISSIONS,
                "Failed To fetch Submissions for User with handle:" + handle
              )
            );

          let submissions: Submission[] = result.result;

          submissions = submissions.filter(
            (submission) => submission.contestId
          );

          return dispatch({
            type: FETCH_USER_SUBMISSIONS,
            payload: { result: submissions, id: currentId },
          });
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (_error) => {
          return dispatch(
            createDispatch(
              ERROR_FETCHING_USER_SUBMISSIONS,
              "Failed To fetch Submissions for User:" + handle
            )
          );
        }
      )
      .catch((_e) => {
        // console.log(e);
        return dispatch(
          createDispatch(
            ERROR_FETCHING_USER_SUBMISSIONS,
            "Failed To fetch Submissions for User:" + handle
          )
        );
      });
  }
};
