import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EstimandControls } from "../../src/components/estimands/EstimandControls";
import { EstimandMethodology } from "../../src/components/estimands/EstimandMethodology";
import { type LabEvent } from "../../src/lib/analytics";
import {
  estimandLabUrlDefaults,
  serializeEstimandHash,
} from "../../src/lib/estimands/urlState";
import {
  useEstimandLab,
  type EstimandLabController,
} from "../../src/hooks/useEstimandLab";

const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard",
);
const removeListeners: Array<() => void> = [];

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  window.history.replaceState(null, "", "#/estimands");
});

const recordEvents = (name: LabEvent["name"]): unknown[] => {
  const events: unknown[] = [];
  const listener = (event: Event): void => {
    if (!(event instanceof CustomEvent)) return;
    const detail: unknown = event.detail;
    if (
      detail &&
      typeof detail === "object" &&
      "name" in detail &&
      detail.name === name
    ) {
      events.push(detail);
    }
  };
  window.addEventListener("luneburn:lab-event", listener);
  removeListeners.push(() =>
    window.removeEventListener("luneburn:lab-event", listener),
  );
  return events;
};

const mountedRoots: Root[] = [];

afterEach(() => {
  mountedRoots.splice(0).forEach((root) => {
    act(() => root.unmount());
  });
  document.body.innerHTML = "";
  removeListeners.splice(0).forEach((remove) => remove());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllTimers();
  vi.useRealTimers();
  window.history.replaceState(null, "", "/");
  if (originalClipboard)
    Object.defineProperty(navigator, "clipboard", originalClipboard);
  else Reflect.deleteProperty(navigator, "clipboard");
});

const mountLab = (): (() => EstimandLabController) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push(root);
  let current: EstimandLabController | undefined;
  const Harness = (): JSX.Element => {
    current = useEstimandLab();
    return createElement("div");
  };
  act(() => root.render(createElement(Harness)));
  return () => {
    if (!current) throw new Error("lab controller was not mounted");
    return current;
  };
};

const renderControls = (
  serializedHash: string,
  clipboardWriteText: (value: string) => Promise<void>,
): HTMLElement => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push(root);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: clipboardWriteText },
  });
  act(() =>
    root.render(
      createElement(EstimandControls, {
        state: estimandLabUrlDefaults,
        serializedHash,
        onDemandCaptureChange: () => undefined,
        onSynergyChange: () => undefined,
        onNoiseChange: () => undefined,
        onRegenerate: () => undefined,
        onReset: () => undefined,
      }),
    ),
  );
  return container;
};

describe("estimand lab interaction hardening", () => {
  it("rehydrates a different permalink while the estimand page remains mounted", () => {
    const events = recordEvents("estimand_control_commit");
    const getLab = mountLab();
    const nextState = {
      ...estimandLabUrlDefaults,
      demandCapture: 0.21,
      synergy: 0.52,
      seed: 9021,
      question: "credit",
    } satisfies Parameters<typeof serializeEstimandHash>[0];
    act(() => {
      window.history.replaceState(null, "", serializeEstimandHash(nextState));
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(getLab().state).toEqual(nextState);
    act(() => vi.advanceTimersByTime(500));
    expect(window.location.hash).toBe(serializeEstimandHash(nextState));
    expect(events).toEqual([]);
  });

  it("debounces hash writes and tolerates replaceState failures", () => {
    vi.useFakeTimers();
    const initialHash = serializeEstimandHash(estimandLabUrlDefaults);
    window.history.replaceState(null, "", initialHash);
    const replaceState = vi.spyOn(window.history, "replaceState");
    const getLab = mountLab();

    act(() => getLab().setDemandCapture(0.42));
    act(() => vi.advanceTimersByTime(100));
    act(() => getLab().setDemandCapture(0.44));
    expect(replaceState).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(199));
    expect(replaceState).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe(
      serializeEstimandHash({ ...estimandLabUrlDefaults, demandCapture: 0.44 }),
    );

    replaceState.mockImplementation(() => {
      throw new DOMException("rate limited", "SecurityError");
    });
    act(() => getLab().setDemandCapture(0.43));
    expect(() => act(() => vi.advanceTimersByTime(200))).not.toThrow();
  });

  it("copies the serialized current state and announces the result", async () => {
    const copied: string[] = [];
    const state = { ...estimandLabUrlDefaults, demandCapture: 0.42 };
    const serializedHash = serializeEstimandHash(state);
    const container = renderControls(serializedHash, async (value) => {
      copied.push(value);
    });
    const copyButton = container.querySelector("button.col-span-2");
    if (!copyButton) throw new Error("copy button not found");

    await act(async () => {
      copyButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(copied).toEqual([
      `${window.location.origin}${window.location.pathname}${serializedHash}`,
    ]);
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "Link copied",
    );
  });

  it("emits one typed reset event", () => {
    const events = recordEvents("estimand_control_commit");
    const getLab = mountLab();

    act(() => getLab().reset());

    expect(events).toEqual([
      {
        name: "estimand_control_commit",
        page: "estimands",
        detail: { control: "all", bucket: "reset" },
      },
    ] satisfies LabEvent[]);
  });

  it("does not swallow the next real control commit after a default reset", () => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "#/assumptions");
    const events = recordEvents("estimand_control_commit");
    const getLab = mountLab();

    act(() => getLab().reset());
    act(() => getLab().setDemandCapture(0.42));
    act(() => vi.advanceTimersByTime(500));

    expect(events).toEqual([
      {
        name: "estimand_control_commit",
        page: "estimands",
        detail: { control: "all", bucket: "reset" },
      },
      {
        name: "estimand_control_commit",
        page: "estimands",
        detail: { control: "demand_capture", bucket: "medium" },
      },
    ] satisfies LabEvent[]);
  });

  it("records reset once when replacing pending control changes", () => {
    vi.useFakeTimers();
    const events = recordEvents("estimand_control_commit");
    const getLab = mountLab();

    act(() => getLab().setDemandCapture(0.42));
    act(() => getLab().reset());
    act(() => vi.advanceTimersByTime(500));

    expect(events).toEqual([
      {
        name: "estimand_control_commit",
        page: "estimands",
        detail: { control: "all", bucket: "reset" },
      },
    ] satisfies LabEvent[]);
  });

  it("tracks methodology opening once per mount", () => {
    const events = recordEvents("methodology_open");
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    mountedRoots.push(root);
    act(() => root.render(createElement(EstimandMethodology)));
    const details = container.querySelector("details");
    if (!details) throw new Error("methodology details not found");

    act(() => {
      details.open = true;
      details.dispatchEvent(new Event("toggle", { bubbles: true }));
      details.open = false;
      details.dispatchEvent(new Event("toggle", { bubbles: true }));
      details.open = true;
      details.dispatchEvent(new Event("toggle", { bubbles: true }));
    });

    expect(events).toHaveLength(1);
  });

  it("does not write an estimand hash after leaving the page", () => {
    const getLab = mountLab();
    act(() => getLab().setDemandCapture(0.42));
    act(() => mountedRoots.pop()?.unmount());
    window.history.replaceState(null, "", "#/assumptions");
    act(() => vi.advanceTimersByTime(500));
    expect(window.location.hash).toBe("#/assumptions");
  });

  it("announces a clipboard failure without claiming a permalink was copied", async () => {
    const events = recordEvents("permalink_copy");
    const container = renderControls(
      serializeEstimandHash(estimandLabUrlDefaults),
      async () => {
        throw new Error("clipboard unavailable");
      },
    );
    const copyButton = container.querySelector("button.col-span-2");
    if (!copyButton) throw new Error("copy button not found");
    await act(async () => {
      copyButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "Copy failed",
    );
    expect(events).toEqual([]);
  });
});
