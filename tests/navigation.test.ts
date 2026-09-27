import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";

describe("two-page navigation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.history.replaceState(null, "", "/");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    ["#/assumptions", "Assumption stress"],
    ["#/estimands", "Estimand contracts"],
  ])("sets a descriptive title on direct entry to %s", (hash, title) => {
    window.history.replaceState(null, "", hash);
    act(() => root.render(createElement(App)));

    expect(document.title).toBe(`Luneburn · ${title}`);
    expect(container.querySelector("footer")?.textContent).toContain(
      "Luneburn / A Measurement Assumption Lab",
    );
  });

  it("hands off from the assumption proof to estimands and updates the tab title", () => {
    window.history.replaceState(null, "", "#/assumptions");
    act(() => root.render(createElement(App)));
    const bridge = container.querySelector<HTMLAnchorElement>(
      'a[aria-label="Next: Estimand contracts"]',
    );
    expect(bridge?.getAttribute("href")).toBe("#/estimands");
    expect(container.querySelector("footer")?.textContent).toContain(
      "Assumptions are the estimate's fine print",
    );
    vi.mocked(window.scrollTo).mockClear();

    act(() => {
      window.history.replaceState(null, "", "#/estimands");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(document.title).toBe("Luneburn · Estimand contracts");
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(container.querySelector("footer")?.textContent).toContain(
      "One truth per well-defined causal question",
    );
  });
});
