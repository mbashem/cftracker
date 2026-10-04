import { vi } from "vitest";
// The spinner package's styled-components CJS/ESM boundary cannot load in jsdom.
// Keep its accessibility/visibility contract; spinner animation is a browser check.
vi.mock("react-loader-spinner", async () => {
  const { createElement } = await import("react");
  return {
    ThreeDots: ({ ariaLabel, visible }: { ariaLabel: string; visible: boolean }) =>
      visible ? createElement("div", { "aria-label": ariaLabel }) : null,
  };
});
