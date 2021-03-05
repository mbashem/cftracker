import { getUserInfo, getUserSubmissions } from "../../util/bashforces";
import { load, errorFecthing } from "./fetchActions";
import {
  ADD_USER,
  CLEAR_USERS,
  ERROR_FETCHING_USER,
  LOADING_USERS,
  ERROR_FETCHING_USER_SUBMISSIONS,
  FETCH_USER_SUBMISSIONS,
  LOADING_USER_SUBMISSIONS,
  CLEAR_USERS_SUBMISSIONS,
} from "./types";

export const clearUsers = (dispatch) =>
  new Promise((resolve, reject) => {
    dispatch({
      type: CLEAR_USERS,
    });
    resolve();
  });

export const fetchUsers = (dispatch, handle) =>
  new Promise((resolve, reject) => {
    dispatch(load(LOADING_USERS));
    clearUsers(dispatch).then(() => {
      fetch(getUserInfo(handle))
        .then((res) => res.json())
        .then(
          (result) => {
            if (result.status !== "OK")
              dispatch(errorFecthing(ERROR_FETCHING_USER, result.comment));
            else {
              result.result.map((user) =>
                dispatch({ type: ADD_USER, payload: user })
              );
            }
          },
          // Note: it's important to handle errors here
          // instead of a catch() block so that we don't swallow
          // exceptions from actual bugs in components.
          (error) => {
            dispatch(errorFecthing(ERROR_FETCHING_USER, "ERROR FETCHING USER"));
          }
        )
        .catch((e) => {
          //  console.log(e);
          dispatch(errorFecthing(ERROR_FETCHING_USER, "ERROR FETCHING USER"));
        });
    });
    resolve();
  });

const userStatus = "https://codeforces.com/api/user.status?handle=bashem";

export const fetchUserSubmissions = (dispatch, handles) => {
  dispatch({ type: CLEAR_USERS_SUBMISSIONS });
  console.log(handles);
  for (let handle of handles) {
    dispatch(load(LOADING_USER_SUBMISSIONS));
    console.log(getUserSubmissions(handle));
    fetch(getUserSubmissions(handle))
      .then((res) => res.json())
      .then(
        (result) => {
          if (result.status !== "OK")
            return errorFecthing(
              ERROR_FETCHING_USER_SUBMISSIONS,
              "Status Failed"
            );
          console.log(result);
          return dispatch({
            type: FETCH_USER_SUBMISSIONS,
            payload: { result: result.result, handle },
          });
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          return dispatch(
            errorFecthing(
              ERROR_FETCHING_USER_SUBMISSIONS,
              "ERROR in User Submission" + error
            )
          );
        }
      )
      .catch((e) => {
        // console.log(e);
        return dispatch(
          errorFecthing(
            ERROR_FETCHING_USER_SUBMISSIONS,
            "ERROR in User Submission" + e
          )
        );
      });
  }
};
