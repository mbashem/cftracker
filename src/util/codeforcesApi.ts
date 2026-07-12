import { IS_DEBUG_MODE } from "./env";
import { StorageService } from "./StorageService";

const debugCacheDurationMs = 30 * 60 * 1000;

interface DebugCacheEntry {
  cachedAt: number;
  response: unknown;
}

const inFlightRequests = new Map<string, Promise<unknown>>();

function getDebugCachedResponse<Response>(url: string): Response | undefined {
  const cache = StorageService.getMap<string, DebugCacheEntry>(StorageService.Keys.Codeforces.DebugApiCache, []);
  const entry = cache.get(url);

  if (entry === undefined) return undefined;
  if (Date.now() - entry.cachedAt < debugCacheDurationMs) return entry.response as Response;

  cache.delete(url);
  StorageService.saveMap(StorageService.Keys.Codeforces.DebugApiCache, cache);
  return undefined;
}

function saveDebugCachedResponse(url: string, response: unknown) {
  const cache = StorageService.getMap<string, DebugCacheEntry>(StorageService.Keys.Codeforces.DebugApiCache, []);
  const now = Date.now();

  for (const [cachedUrl, entry] of cache) {
    if (now - entry.cachedAt >= debugCacheDurationMs) cache.delete(cachedUrl);
  }

  cache.set(url, { cachedAt: now, response });
  StorageService.saveMap(StorageService.Keys.Codeforces.DebugApiCache, cache);
}

async function fetchJson<Response>(url: string): Promise<Response> {
  const response = await fetch(url);
  return response.json() as Promise<Response>;
}

export function fetchCodeforcesApi<Response>(url: string): Promise<Response> {
  if (!IS_DEBUG_MODE) return fetchJson<Response>(url);

  const cachedResponse = getDebugCachedResponse<Response>(url);
  if (cachedResponse !== undefined) {
    console.log(`CFTracker is running in debug mode. Using cached Codeforces API response for ${url}.`);
    return Promise.resolve(cachedResponse);
  }

  const inFlightRequest = inFlightRequests.get(url);
  if (inFlightRequest !== undefined) return inFlightRequest as Promise<Response>;

  console.log(`CFTracker is running in debug mode. Caching Codeforces API response for ${url} for 30 minutes.`);
  const request = fetchJson<Response>(url)
    .then((response) => {
      saveDebugCachedResponse(url, response);
      return response;
    })
    .finally(() => inFlightRequests.delete(url));

  inFlightRequests.set(url, request);
  return request;
}
