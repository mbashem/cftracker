import type { AppDispatch, RootState } from "../store";
import { userApi } from "../queries/userQuery";
import { checkAuthentication, removeUser, setUser } from "../reducers/userSlice";
import { isBackendAccessEnabled } from "../../util/backendAccess";

export function validateSession(token: string | undefined) {
  return async (dispatch: AppDispatch, getState: () => RootState): Promise<boolean | undefined> => {
    const sessionToken = isBackendAccessEnabled() ? token : undefined;
    dispatch(checkAuthentication(sessionToken));
    if (!sessionToken) return false;
    const version = getState().userList.authenticationVersion;
    const isCurrentSession = () => getState().userList.authenticationVersion === version;
    try {
      const user = await dispatch(userApi.endpoints.getProfile.initiate(sessionToken, {
        forceRefetch: true, subscribe: false,
      })).unwrap();
      if (!isCurrentSession()) return undefined;
      dispatch(setUser(user));
      return true;
    } catch {
      if (!isCurrentSession()) return undefined;
      dispatch(removeUser());
      return false;
    }
  };
}
