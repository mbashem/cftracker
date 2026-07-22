import { createListenerMiddleware } from "@reduxjs/toolkit";
import { SubmissionData } from "../../types/CF/Submission";
import { fetchCodeforcesApi } from "../../util/codeforcesApi";
import { getUserSubmissionsURL, isDefined } from "../../util/util";
import {
  addUserSubmissions,
  errorFetchingUserSubmissions,
  requestUserSubmissions,
} from "../reducers/userSubmissionsSlice";

interface UserSubmissionsResponse {
  status: string;
  result: SubmissionData[];
}

export const userSubmissionsListener = createListenerMiddleware();

userSubmissionsListener.startListening({
  actionCreator: requestUserSubmissions,
  effect: async (action, listenerApi) => {
    listenerApi.cancelActiveListeners();

    const { handles, requestId, wait } = action.payload;

    try {
      if (wait) await listenerApi.delay(1000);

      for (const [index, handle] of handles.entries()) {
        if (index > 0) await listenerApi.delay(1000);

        try {
          const response = await listenerApi.pause(
            fetchCodeforcesApi<UserSubmissionsResponse>(getUserSubmissionsURL(handle))
          );
          listenerApi.throwIfCancelled();

          if (response.status !== "OK") {
            listenerApi.dispatch(errorFetchingUserSubmissions({
              error: `Failed To fetch Submissions for User with handle:${handle}`,
              requestId,
            }));
            continue;
          }

          listenerApi.dispatch(addUserSubmissions({
            requestId,
            submissions: getValidSubmissions(response.result),
          }));
        } catch (error) {
          if (listenerApi.signal.aborted) return;

          console.log(error);
          listenerApi.dispatch(errorFetchingUserSubmissions({
            error: `Failed To fetch Submissions for User:${handle}`,
            requestId,
          }));
        }
      }
    } catch (error) {
      if (!listenerApi.signal.aborted) console.log(error);
    }
  },
});

function getValidSubmissions(submissions: SubmissionData[]): SubmissionData[] {
  return submissions.filter(
    (submission) => isDefined(submission.contestId) && isDefined(submission.verdict)
  );
}
