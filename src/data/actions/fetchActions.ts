import { ProblemLite, ProblemShared } from "../../types/CF/Problem";
import { AppDispatch } from "../store";
import { addSharedProblems, errorFetchingSharedProblems } from "../reducers/sharedProblemsSlice";

export const fetchSharedProblemList = async (dispatch: AppDispatch) => {
  import("../saved_api/related")
    .then(
      (data) => {
        const result = data.jsonData;
        if (result.status !== "OK")
          return dispatch(errorFetchingSharedProblems("Error fetching shared problems api call failed"));
        const res: ProblemShared[] = result.result as ProblemShared[];

        const sharedProblems: ProblemShared[] = [];

        for (let shared of res) {
          let curr = new ProblemShared(shared.contestId, shared.index);

          for (let lite of shared.shared ?? [])
            curr.shared?.push(new ProblemLite(lite.contestId!, lite.index));
          sharedProblems.push(curr);
        }

        return dispatch(addSharedProblems(sharedProblems));
      },
      (_error) => {
        return dispatch(errorFetchingSharedProblems("Error processing shared problems"));
      }
    )
    .catch((e) => {
      console.log(e);
      return dispatch(errorFetchingSharedProblems("ERROR in PROBLEM LIST"));
    });
};
