import { StorageService } from "./StorageService";
import { BACKEND_API_URL, IS_BACKEND_AVAILABLE } from "./env";

// This is a soft rollout barrier, not authorization. Users may opt in manually
// and use the experimental backend at their own risk; direct API access remains
// possible. Keep this flag across logout so a rollout grant stays enabled.
export function isBackendAccessEnabled(): boolean {
  return IS_BACKEND_AVAILABLE && Boolean(BACKEND_API_URL)
    && StorageService.getValue<unknown>(StorageService.Keys.BackendEnabled, false) === true;
}
