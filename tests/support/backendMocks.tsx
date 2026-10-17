import { vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import type { PropsWithChildren } from "react";

// Set the endpoint before importing the real query modules; no hook mocks here.
vi.stubEnv("VITE_BACKEND_API_URL", "https://backend.example.test");
vi.stubEnv("VITE_DEBUG_MODE", "false");
const { userApi } = await import("../../src/data/queries/userQuery");
const { listApi } = await import("../../src/data/queries/listQuery");
const { default: userReducer } = await import("../../src/data/reducers/userSlice");

const { codeforcesApi } = await import("../../src/data/queries/codeforcesQuery");
const { default: userSubmissions } = await import("../../src/data/reducers/userSubmissionsSlice");
const { default: appState } = await import("../../src/data/reducers/appSlice");
const { userSubmissionsListener } = await import("../../src/data/listeners/userSubmissionsListener");

export const backendUser = {
  id: 7, github_id: 42, github_username: "octocat", email: "octocat@example.test",
  avatar_url: "https://example.test/avatar", cf_handle: "tourist", cf_verified_handle: "tourist", admin: false,
};
export const backendList = { id: 5, user_id: 7, name: "Practice", created_at: "2026-01-01" };
export const backendItem = { list_id: 5, problem_id: "100A", position: 2, created_at: "2026-01-02" };

export function setupBackendMock(catalogApi = codeforcesApi) {
  const requests: Request[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const request = new Request(input);
    requests.push(request);
    return Response.json({});
  });
  vi.stubGlobal("fetch", fetchMock);
  const store = configureStore({
    reducer: { appState, userSubmissions, [catalogApi.reducerPath]: catalogApi.reducer, userList: userReducer, [userApi.reducerPath]: userApi.reducer, [listApi.reducerPath]: listApi.reducer },
    middleware: (defaults) => defaults().prepend(userSubmissionsListener.middleware).concat(userApi.middleware, listApi.middleware, catalogApi.middleware),
  });
  const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
  function respond(body: unknown, status = 200) {
    fetchMock.mockImplementation(async (input) => {
      requests.push(new Request(input));
      return Response.json(body, { status });
    });
  }
  function dispose() {
    store.dispatch(catalogApi.util.resetApiState());
    store.dispatch(userApi.util.resetApiState());
    store.dispatch(listApi.util.resetApiState());
    vi.unstubAllGlobals();
  }
  return { store, wrapper, requests, fetchMock, respond, dispose };
}
export { userApi, listApi, codeforcesApi };
