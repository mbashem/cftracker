import { createTesterClient, ENDPOINTS, normalizeOrigin, buildRequest, STORAGE_KEY } from "./api-tester-client.mjs";

const element = id => document.getElementById(id);
let previousOrigin;
let previousToken;
let responseBody = "";
let busy = false;
let storage;
try { storage = window.localStorage; }
catch { storage = { getItem() { throw new Error("Storage unavailable"); }, setItem() { throw new Error("Storage unavailable"); }, removeItem() { throw new Error("Storage unavailable"); } }; }

function message(text, error = false) {
  element("message").textContent = text;
  element("message").dataset.error = String(error);
  element("message").hidden = !text;
}
function formatBody(value) {
  try { return JSON.stringify(JSON.parse(value), null, 2); }
  catch { return value; }
}
function showResponse(record) {
  if (!record) {
    responseBody = "";
    element("response-meta").textContent = "Your response will appear here.";
    element("response-meta").removeAttribute("data-ok");
    element("response-body").textContent = "No response yet.";
    element("response-headers").textContent = "—";
    element("sent-body").textContent = "—";
    return;
  }
  responseBody = String(record.body ?? "");
  element("response-meta").textContent = `${record.method} · HTTP ${record.status} · ${record.elapsed} ms${record.truncated ? " · saved body truncated" : ""}`;
  element("response-meta").dataset.ok = String(record.ok);
  element("response-body").textContent = formatBody(responseBody) || "(empty body)";
  element("response-headers").textContent = JSON.stringify(record.headers ?? {}, null, 2);
  element("sent-body").textContent = record.requestBody || "(no request body)";
}
function render(snapshot) {
  const { workspace, origin } = snapshot;
  if (origin !== previousOrigin) { element("origin").value = origin; previousOrigin = origin; }
  if (workspace.token !== previousToken) { element("token").value = workspace.token; previousToken = workspace.token; }
  element("storage-message").hidden = !snapshot.storageError;
  element("storage-message").textContent = snapshot.storageError;
  element("session-status").dataset.signedIn = String(Boolean(workspace.token));
  element("session-status").textContent = workspace.token ? (workspace.profile ? "Profile loaded" : "Token saved · unchecked") : "Signed out";
  const profile = workspace.profile;
  element("profile-summary").textContent = profile
    ? `${profile.github_username || "Account"} · ID ${profile.id ?? "—"} · CF ${profile.cf_handle || "not selected"}`
    : workspace.token ? "Token saved for this backend. Check session to validate it." : "No saved session.";
  element("check-session").disabled = busy || !workspace.token;
  element("saved-origins").replaceChildren(...Object.keys(snapshot.environments).map(value => {
    const option = document.createElement("option"); option.value = value; return option;
  }));
  element("history-count").textContent = `(${workspace.history.length}/30)`;
  const history = element("history");
  history.replaceChildren();
  for (const record of workspace.history) {
    const button = document.createElement("button"); button.type = "button";
    const title = document.createElement("span"); title.textContent = `${record.method} · ${record.status} · ${record.url}`;
    const meta = document.createElement("span"); meta.className = "meta"; meta.textContent = `${record.at} · ${record.elapsed} ms`;
    button.append(title, meta); button.addEventListener("click", () => showResponse(record)); history.append(button);
  }
  if (!workspace.history.length) { const empty = document.createElement("p"); empty.className = "subtle"; empty.textContent = "No requests yet."; history.append(empty); }
  showResponse(workspace.history[0]);
  preview();
}

const client = createTesterClient({ storage, fetch: (...args) => window.fetch(...args), onChange: render });

function draft() {
  return { listId: element("list-id").value, itemId: element("item-id").value, body: element("request-body").value };
}
function selected() { return ENDPOINTS.find(endpoint => endpoint.id === element("endpoint").value) ?? ENDPOINTS[0]; }
function preview() {
  const endpoint = selected();
  const state = client.snapshot();
  element("request-method").textContent = endpoint.method;
  element("send").textContent = busy ? "Sending…" : `Send ${endpoint.method} request`;
  element("send").disabled = busy || (!endpoint.public && !state.workspace.token);
  try { element("request-url").textContent = buildRequest(state.origin, endpoint, draft()); }
  catch { element("request-url").textContent = state.origin + endpoint.path; }
  const headers = { Accept: "application/json" };
  if (!endpoint.public) headers.Authorization = "Bearer [saved token]";
  if (endpoint.body !== undefined) headers["Content-Type"] = "application/json";
  element("request-headers").textContent = JSON.stringify(headers, null, 2);
  const notes = {
    verify: "Updates ownership state. Set your Codeforces first name to the challenge before sending.",
    challenge: "The returned challenge is not a bearer token. It expires after one hour.",
    delete: "Deletes the selected list and all its items.",
    add: "Inserts a new item; this is not an upsert. Duplicates may return HTTP 500.",
  };
  element("request-note").textContent = notes[endpoint.id] || (endpoint.public ? "Public endpoint · no bearer token sent." : "Protected endpoint · sign in or save a token before sending.");
}
function fillRequest() {
  const state = client.snapshot();
  element("endpoint").value = state.workspace.endpoint;
  const endpoint = selected();
  const saved = state.workspace.drafts[endpoint.id] ?? {};
  element("list-id-field").hidden = !endpoint.path.includes(":listId");
  element("item-id-field").hidden = !endpoint.path.includes(":itemId");
  element("body-field").hidden = endpoint.body === undefined;
  element("list-id").value = saved.listId ?? "";
  element("item-id").value = saved.itemId ?? "";
  element("request-body").value = saved.body ?? endpoint.body ?? "";
  preview();
}
function appliedOrigin() {
  if (normalizeOrigin(element("origin").value) !== client.snapshot().origin) throw new Error("Click Use backend to apply the edited origin first.");
}
async function run(action) {
  if (busy) return;
  busy = true; message(""); preview();
  try {
    const result = await action();
    if (result?.stale) return;
    if (result) showResponse(result);
  } catch (error) {
    message(error.message, true);
  } finally { busy = false; render(client.snapshot()); }
}

const groups = new Map();
for (const endpoint of ENDPOINTS) {
  if (!groups.has(endpoint.group)) {
    const group = document.createElement("optgroup"); group.label = endpoint.group;
    groups.set(endpoint.group, group); element("endpoint").append(group);
  }
  const option = document.createElement("option"); option.value = endpoint.id; option.textContent = `${endpoint.method} · ${endpoint.label}`;
  groups.get(endpoint.group).append(option);
}
element("origin-form").addEventListener("submit", event => {
  event.preventDefault();
  try { client.setOrigin(element("origin").value); fillRequest(); message("Backend workspace loaded."); }
  catch (error) { message(error.message, true); }
});
element("token-form").addEventListener("submit", event => {
  event.preventDefault();
  try { appliedOrigin(); client.setToken(element("token").value); message("Token saved for this backend."); }
  catch (error) { message(error.message, true); }
});
element("show-token").addEventListener("change", event => { element("token").type = event.target.checked ? "text" : "password"; });
element("endpoint").addEventListener("change", () => { client.select(selected().id); fillRequest(); });
for (const id of ["list-id", "item-id", "request-body"]) element(id).addEventListener("input", () => client.draft(selected().id, draft()));
element("request-form").addEventListener("submit", event => {
  event.preventDefault();
  void run(() => { appliedOrigin(); client.draft(selected().id, draft()); return client.request(selected().id, draft()); });
});
element("check-session").addEventListener("click", () => { void run(() => { appliedOrigin(); return client.request("profile"); }); });
element("logout").addEventListener("click", () => { client.logout(); message("Session and response history cleared for this backend."); });
element("clear-all").addEventListener("click", () => { client.clear(); fillRequest(); message("All tester workspaces cleared."); });
element("github-login").addEventListener("click", () => {
  try { appliedOrigin(); window.location.assign(client.beginOAuth()); }
  catch (error) { message(error.message, true); }
});
element("copy-response").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(responseBody); message("Response body copied."); }
  catch { message("Clipboard is unavailable. Select and copy the response text directly.", true); }
});
window.addEventListener("storage", event => {
  if (event.key === STORAGE_KEY || event.key === null) { client.reload(); fillRequest(); }
});

element("callback-url").textContent = window.location.origin + "/callback/auth-gh";
element("startup-message").hidden = true;
render(client.snapshot()); fillRequest();

const callback = new URL(window.location.href);
if (["code", "state", "error"].some(key => callback.searchParams.has(key))) {
  const code = callback.searchParams.get("code");
  const state = callback.searchParams.get("state");
  const error = callback.searchParams.get("error");
  const description = callback.searchParams.get("error_description");
  for (const key of ["code", "state", "error", "error_description", "error_uri"]) callback.searchParams.delete(key);
  window.history.replaceState(null, "", callback.href);
  if (error || !code || !state) {
    client.cancelOAuth(); message(description || error || "Incomplete GitHub callback. Start a new login.", true);
  } else {
    void run(async () => {
      const record = await client.completeOAuth(code, state);
      if (!record.stale) message("Signed in with GitHub. Session saved for this backend.");
      return record;
    });
  }
}
