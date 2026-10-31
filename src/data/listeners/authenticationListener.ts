import { createListenerMiddleware } from "@reduxjs/toolkit";
import { listApi } from "../queries/listQuery";
import { userApi } from "../queries/userQuery";
import type { UserState } from "../reducers/userSlice";
import { StorageService } from "../../util/StorageService";

export const authenticationListener = createListenerMiddleware<{ userList: UserState }>();

authenticationListener.startListening({
  predicate: (_action, current, previous) => (
    current.userList.sessionToken !== previous.userList.sessionToken
    || (previous.userList.authenticationStatus === 'authenticated'
      && current.userList.authenticationStatus !== 'authenticated')
    || (!current.userList.sessionToken
      && current.userList.authenticationVersion !== previous.userList.authenticationVersion)
  ),
  effect: (_action, api) => {
    const token = api.getState().userList.sessionToken;
    if (token) StorageService.setJWTToken(token);
    else StorageService.removeJWTToken();
    api.dispatch(listApi.util.resetApiState());
    api.dispatch(userApi.util.resetApiState());
  },
});
