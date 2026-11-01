# Reusing frontend test support

Use the existing support modules before adding suite-local mocks or fixtures.

- `frontendMocks.ts` replaces page dependencies. Call `resetFrontendMocks()` in
  `beforeEach`, then set the scenario's fields and mock responses explicitly.
- For page suites, `setupFrontendTests(seed)` registers the shared reset,
  jsdom localStorage clearing, component cleanup, and spy restoration. Pass a
  fixture seeder or callback for scenario defaults; register additional hooks
  after it. Import it only in suites that use `frontendMocks`.
- `listFixtures.ts` supplies `createList(overrides)` and
  `createListItem(overrides)` for application-shaped list data. Every call
  returns fresh objects; list items are copied so scenarios can change them
  without altering another fixture.
- `backendMocks.tsx` keeps Redux reducers, listeners, and RTK Query real while
  replacing fetch. Call `setupBackendMock()` for each case and `dispose()` after
  unmounting components. Clear jsdom localStorage separately when the scenario
  uses persisted state. Do not share an instance across cases or mount concurrent
  instances: fetch is a global mock.
- Use `backend.respond(body, status)` for a repeated JSON response,
  `backend.handleRequests(request => response)` for routing or stateful behavior,
  and `backend.deferResponse()` for the next pending request. All three record
  requests in `backend.requests`; deferred requests are recorded when sent,
  before they complete. A deferred response exposes `resolve(Response)` and
  `reject(error)`. Queue several to control completion order, and settle them
  before teardown. Direct `fetchMock` overrides bypass request recording.
- `deferred.ts` supplies `createDeferred<T>()` for non-fetch async dependencies.
  Pass its promise to the existing dependency mock rather than creating another
  mock implementation.
- Reuse the model fixtures, router probes, and chart/analytics mocks here.
  Seed fixtures after resetting dependency mocks; avoid mutating shared data.

Run affected suites individually and shuffled together to check order independence:

```sh
npm run test:frontend -- tests/list/listAuthentication.test.tsx --no-cache
npm run test:frontend -- --no-cache --sequence.shuffle --sequence.seed=20261101
```

Use the Node version from `.nvmrc`. These checks use jsdom and mocked fetch;
they do not require a server or verify live service behavior.

Keep behavior at the narrowest useful level: validators and sorters own their
input matrices; hooks own data and persistence boundaries; page tests own control
wiring and visible outcomes. Avoid repeating a full matrix at each level or
adding mock-helper tests for scenarios already covered through production code.
