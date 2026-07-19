import {
  getUserSubmissionsURL,
  isDefined,
} from "../../util/util";
import Submission from "../../types/CF/Submission";
import { AppDispatch } from "../store";
import { addUserSubmissions, clearAllUsersSubmissions, errorFetchingUserSubmissions, loadingUserSubmissions } from "../reducers/userSubmissionsSlice";
import { delay } from "../../util/time";
import { fetchCodeforcesApi } from "../../util/codeforcesApi";

interface UserSubmissionsResponse {
  status: string;
  result: Submission[];
}

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

    fetchCodeforcesApi<UserSubmissionsResponse>(getUserSubmissionsURL(handle))
      .then(
        (result) => {
          if (result.status !== "OK")
            return dispatch(errorFetchingUserSubmissions("Failed To fetch Submissions for User with handle:" + handle));

          let submissions: Submission[] = result.result;

          submissions = submissions.filter(
            (submission) => isDefined(submission.contestId) && isDefined(submission.verdict)
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
