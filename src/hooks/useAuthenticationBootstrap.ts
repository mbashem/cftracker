import { useEffect } from "react";
import { useAppDispatch } from "../data/store";
import { validateSession } from "../data/actions/authentication";
import { StorageService } from "../util/StorageService";
import { isBackendAccessEnabled } from "../util/backendAccess";

export default function useAuthenticationBootstrap() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch((dispatch, getState) => {
      if (getState().userList.authenticationInitialized) return;
      const token = isBackendAccessEnabled() ? StorageService.getJWTToken() ?? undefined : undefined;
      void dispatch(validateSession(token));
    });
  }, [dispatch]);
}
