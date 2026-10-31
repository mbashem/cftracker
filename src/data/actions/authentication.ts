import type { AppDispatch, RootState } from "../store";
import { userApi } from "../queries/userQuery";
import { checkAuthentication, removeUser, setUser } from "../reducers/userSlice";

export function validateSession(token: string | undefined) {
  return async (dispatch: AppDispatch, getState: () => RootState): Promise<boolean | undefined> => {
    dispatch(checkAuthentication(token));
    if (!token) return false;
    const version = getState().userList.authenticationVersion;
    const isCurrentSession = () => getState().userList.authenticationVersion === version;
    try {
      const user = await dispatch(userApi.endpoints.getProfile.initiate(token, {
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
