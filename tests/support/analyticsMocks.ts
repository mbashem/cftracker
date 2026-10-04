import { vi, type Mock } from "vitest";
const analytics: { initialize: Mock; send: Mock } = vi.hoisted(() => ({ initialize: vi.fn(), send: vi.fn() }));
vi.mock("react-ga4", () => ({ default: analytics }));
export { analytics };
