import { vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import type { PropsWithChildren } from "react";
import { createDeferred } from "./deferred";

// Set the endpoint before importing the real query modules; no hook mocks here.
vi.stubEnv("VITE_BACKEND_API_URL", "https://backend.example.test/api");
vi.stubEnv("VITE_DEBUG_MODE", "false");
vi.stubEnv("VITE_IS_BACKEND_AVAILABLE", "true");
const { userApi } = await import("../../src/data/queries/userQuery");
const { listApi } = await import("../../src/data/queries/listQuery");
const { default: userReducer, setUser } = await import("../../src/data/reducers/userSlice");

const { codeforcesApi } = await import("../../src/data/queries/codeforcesQuery");
const { default: userSubmissions } = await import("../../src/data/reducers/userSubmissionsSlice");
const { default: appState } = await import("../../src/data/reducers/appSlice");
const { userSubmissionsListener } = await import("../../src/data/listeners/userSubmissionsListener");
const { authenticationListener } = await import("../../src/data/listeners/authenticationListener");

export const backendUser = {
  id: 7, github_id: 42, github_username: "octocat", email: "octocat@example.test",
  avatar_url: "https://example.test/avatar", cf_handle: "tourist", cf_verified_handle: "tourist", admin: false,
};
export const backendList = { id: 5, user_id: 7, name: "Practice", created_at: "2026-01-01" };
export const backendItem = { list_id: 5, problem_id: "100A", position: 2, created_at: "2026-01-02" };
export const authenticatedUser = {
  id: 7, githubId: 42, githubUsername: "octocat", email: "octocat@example.test",
  avatarUrl: "https://example.test/avatar", cfHandle: "tourist", cfVerifiedHandle: "tourist",
  admin: false, jwtToken: "test-session",
};

export function setupBackendMock(catalogApi = codeforcesApi) {
  const requests: Request[] = [];
  type ResponseHandler = (request: Request) => Response | Promise<Response>;
  function recordRequest(handler: ResponseHandler) {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push(request);
      return handler(request);
    };
  }
  const fetchMock = vi.fn(recordRequest(() => Response.json({})));
  vi.stubGlobal("fetch", fetchMock);
  const store = configureStore({
    reducer: { appState, userSubmissions, [catalogApi.reducerPath]: catalogApi.reducer, userList: userReducer, [userApi.reducerPath]: userApi.reducer, [listApi.reducerPath]: listApi.reducer },
    middleware: (defaults) => defaults().prepend(authenticationListener.middleware, userSubmissionsListener.middleware).concat(userApi.middleware, listApi.middleware, catalogApi.middleware),
  });
  const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
  function handleRequests(handler: ResponseHandler) {
    fetchMock.mockImplementation(recordRequest(handler));
  }
  function respond(body: unknown, status = 200) {
    handleRequests(() => Response.json(body, { status }));
  }
  function deferResponse() {
    const deferred = createDeferred<Response>();
    fetchMock.mockImplementationOnce(recordRequest(() => deferred.promise));
    return deferred;
  }
  function dispose() {
    store.dispatch(catalogApi.util.resetApiState());
    store.dispatch(userApi.util.resetApiState());
    store.dispatch(listApi.util.resetApiState());
    vi.unstubAllGlobals();
  }
  function authenticate(user = authenticatedUser) {
    store.dispatch(setUser(user));
  }
  return { store, wrapper, requests, fetchMock, respond, handleRequests, deferResponse, dispose, authenticate };
}
export { userApi, listApi, codeforcesApi };
