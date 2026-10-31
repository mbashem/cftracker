export const STORAGE_KEY = "cftracker.api-tester.v1";
export const DEFAULT_ORIGIN = "http://localhost:8080";
export const ENDPOINTS = [
  { id: "live", group: "Health", method: "GET", path: "/health/live", label: "Liveness", public: true },
  { id: "ready", group: "Health", method: "GET", path: "/health/ready", label: "Readiness", public: true },
  { id: "profile", group: "Account", method: "GET", path: "/api/v1/user/profile", label: "Get profile" },
  { id: "handle", group: "Account", method: "PUT", path: "/api/v1/user/cfhandle", label: "Select Codeforces handle", body: '{"cf_handle":"tourist"}' },
  { id: "challenge", group: "Account", method: "GET", path: "/api/v1/user/cfverification-token", label: "Get verification challenge" },
  { id: "verify", group: "Account", method: "GET", path: "/api/v1/user/verify-cftoken", label: "Verify Codeforces ownership" },
  { id: "lists", group: "Lists", method: "GET", path: "/api/v1/lists", label: "Get all lists" },
  { id: "create", group: "Lists", method: "POST", path: "/api/v1/lists", label: "Create a list", body: '{"name":"Practice"}' },
  { id: "list", group: "Lists", method: "GET", path: "/api/v1/lists/:listId", label: "Get list and items" },
  { id: "rename", group: "Lists", method: "PUT", path: "/api/v1/lists/:listId", label: "Rename a list", body: '{"name":"Updated practice"}' },
  { id: "delete", group: "Lists", method: "DELETE", path: "/api/v1/lists/:listId", label: "Delete a list" },
  { id: "add", group: "Items", method: "PUT", path: "/api/v1/lists/:listId/item", label: "Add problem to list", body: '{"problem_id":"1900A","position":0}' },
  { id: "remove", group: "Items", method: "DELETE", path: "/api/v1/lists/:listId/item/:itemId", label: "Remove problem from list" },
];

export function normalizeOrigin(value) {
  const url = new URL(value.trim());
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password
    || url.search || url.hash || !["/", "/api", "/api/", "/api/v1", "/api/v1/"].includes(url.pathname)) {
    throw new Error("Use an HTTP(S) backend origin, for example http://localhost:8080, without credentials or query parameters.");
  }
  return url.origin;
}

function workspace() {
  return { token: "", profile: undefined, endpoint: "live", drafts: {}, history: [] };
}

export function buildRequest(origin, endpoint, parameters = {}) {
  let path = endpoint.path;
  for (const name of ["listId", "itemId"]) {
    if (!path.includes(`:${name}`)) continue;
    const value = String(parameters[name] ?? "").trim();
    if (!value) throw new Error(`Enter ${name} before sending this request.`);
    path = path.replace(`:${name}`, encodeURIComponent(value));
  }
  return normalizeOrigin(origin) + path;
}

export function createTesterClient({ storage, fetch: fetchRequest, now = Date.now, onChange = () => {} }) {
  let state;
  let revision = 0;
  let storageError = "";

  function read() {
    state = { origin: DEFAULT_ORIGIN, environments: {} };
    try {
      const saved = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
      if (saved && typeof saved === "object") {
        state.origin = normalizeOrigin(saved.origin || DEFAULT_ORIGIN);
        if (saved.environments && typeof saved.environments === "object") {
          for (const [origin, value] of Object.entries(saved.environments)) {
            if (!value || typeof value !== "object" || normalizeOrigin(origin) !== origin) continue;
            state.environments[origin] = {
              ...workspace(),
              token: typeof value.token === "string" ? value.token : "",
              profile: value.profile && typeof value.profile === "object" ? value.profile : undefined,
              endpoint: ENDPOINTS.some(endpoint => endpoint.id === value.endpoint) ? value.endpoint : "live",
              drafts: value.drafts && typeof value.drafts === "object" ? value.drafts : {},
              history: Array.isArray(value.history) ? value.history.slice(0, 30).filter(record => record && typeof record === "object") : [],
            };
          }
        }
        if (saved.pendingOAuth && typeof saved.pendingOAuth.origin === "string" && Number.isFinite(saved.pendingOAuth.started)) {
          state.pendingOAuth = { origin: normalizeOrigin(saved.pendingOAuth.origin), started: saved.pendingOAuth.started };
        }
      }
    } catch {
      storageError = "Saved workspace could not be read. You can continue; use Clear all local data to reset it.";
    }
    state.environments[state.origin] ??= workspace();
  }
  function current() { return state.environments[state.origin]; }
  function snapshot() { return structuredClone({ ...state, workspace: current(), storageError }); }
  function save() {
    try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); storageError = ""; }
    catch { storageError = "Local storage is unavailable or full. Current changes are held in memory and may be lost on reload."; }
    onChange(snapshot());
  }
  function addRecord(record) {
    current().history.unshift(record);
    current().history = current().history.slice(0, 30);
  }
  async function perform(url, options, version, privateRequest) {
    const start = now();
    let response;
    let raw;
    try {
      response = await fetchRequest(url, { ...options, credentials: "include", redirect: "error" });
      raw = await response.text();
    } catch (error) {
      if (version !== revision) return { stale: true };
      const record = {
        method: options.method, url: url.split("?")[0], status: 0, ok: false,
        at: new Date(start).toISOString(), elapsed: Math.max(0, now() - start),
        requestBody: options.body || "", headers: {},
        body: `Request could not complete: ${error.message}. Check the backend origin, connectivity, CORS, cookie settings, and unexpected redirects.`,
      };
      addRecord(record); save(); return record;
    }
    if (version !== revision) return { stale: true };
    const record = {
      method: options.method, url: url.split("?")[0], status: response.status, ok: response.ok,
      at: new Date(start).toISOString(), elapsed: Math.max(0, now() - start),
      requestBody: options.body || "", body: raw.slice(0, 200000), truncated: raw.length > 200000,
      headers: Object.fromEntries(response.headers.entries()),
    };
    if (privateRequest && response.status === 401) {
      revision += 1;
      current().token = "";
      current().profile = undefined;
      current().history = [];
    }
    addRecord(record);
    save();
    return record;
  }
  read();

  return {
    snapshot,
    reload() { revision += 1; read(); onChange(snapshot()); },
    setOrigin(value) {
      const origin = normalizeOrigin(value);
      if (origin !== state.origin) revision += 1;
      state.origin = origin;
      state.environments[origin] ??= workspace();
      save();
    },
    setToken(value) {
      revision += 1;
      current().token = value.trim().replace(/^Bearer\s+/i, "");
      current().profile = undefined;
      current().history = [];
      save();
    },
    logout() {
      revision += 1;
      current().token = "";
      current().profile = undefined;
      current().history = [];
      state.pendingOAuth = undefined;
      save();
    },
    clear() {
      revision += 1;
      state = { origin: DEFAULT_ORIGIN, environments: { [DEFAULT_ORIGIN]: workspace() } };
      storageError = "";
      try { storage.removeItem(STORAGE_KEY); }
      catch { storageError = "The browser did not allow local data to be removed."; }
      onChange(snapshot());
    },
    select(id) {
      if (!ENDPOINTS.some(endpoint => endpoint.id === id)) throw new Error("Select a documented endpoint.");
      current().endpoint = id;
      save();
    },
    draft(id, value) {
      current().drafts[id] = { listId: value.listId || "", itemId: value.itemId || "", body: value.body || "" };
      save();
    },
    async request(id, draft = {}) {
      const endpoint = ENDPOINTS.find(value => value.id === id);
      if (!endpoint) throw new Error("Select a documented endpoint.");
      if (!endpoint.public && !current().token) throw new Error("Sign in with GitHub or paste a bearer token first.");
      const version = revision;
      const headers = { Accept: "application/json" };
      if (!endpoint.public) headers.Authorization = `Bearer ${current().token}`;
      const options = { method: endpoint.method, headers };
      if (endpoint.body !== undefined) {
        headers["Content-Type"] = "application/json";
        options.body = draft.body ?? endpoint.body;
      }
      const record = await perform(buildRequest(state.origin, endpoint, draft), options, version, !endpoint.public);
      if (record.stale || version !== revision) return record;
      if (id === "profile" && record.ok) {
        try { current().profile = JSON.parse(record.body).user; } catch { /* Keep raw responses inspectable. */ }
        save();
      }
      return record;
    },
    beginOAuth() {
      state.pendingOAuth = { origin: state.origin, started: now() };
      save();
      if (storageError) throw new Error("GitHub login needs local storage to retain the backend origin across redirects.");
      return state.origin + "/api/v1/auth/github/login";
    },
    cancelOAuth() { state.pendingOAuth = undefined; save(); },
    async completeOAuth(code, oauthState) {
      const pending = state.pendingOAuth;
      if (!pending || now() - pending.started > 600000 || now() < pending.started) {
        throw new Error("No active GitHub login. Start a new login from this tester.");
      }
      if (!code || !oauthState) throw new Error("GitHub callback is missing its code or state. Start a new login.");
      state.origin = pending.origin;
      state.environments[state.origin] ??= workspace();
      const version = revision;
      state.pendingOAuth = undefined;
      save();
      const query = new URLSearchParams({ code, state: oauthState });
      const record = await perform(`${state.origin}/api/v1/auth/github/callback?${query}`, {
        method: "GET", headers: { Accept: "application/json" },
      }, version, false);
      if (record.stale) return record;
      if (!record.ok) throw new Error(`GitHub sign-in failed (HTTP ${record.status}). Start a new login; inspect the response below.`);
      const payload = JSON.parse(record.body);
      if (typeof payload.token !== "string" || !payload.token) throw new Error("The callback did not return a session token.");
      revision += 1;
      current().token = payload.token;
      current().profile = payload.user;
      current().history = [record];
      save();
      return record;
    },
  };
}
