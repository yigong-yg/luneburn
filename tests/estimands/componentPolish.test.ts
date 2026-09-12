import React, { useState } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DecisionCheck } from "../../src/components/estimands/DecisionCheck";
import { EstimandLedgerBoard } from "../../src/components/estimands/EstimandLedgerBoard";
import { QuestionSelector } from "../../src/components/estimands/QuestionSelector";
import type {
  EstimandLedger,
  EstimandLedgerPanel,
  EstimandQuestion,
} from "../../src/lib/estimands/ledger";
import { CHANNELS, type ChannelId } from "../../src/lib/estimands/types";

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

const roots: Root[] = [];

afterEach(() => {
  for (const root of roots) {
    act(() => root.unmount());
  }
  roots.length = 0;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

const render = (element: React.ReactElement): HTMLElement => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  act(() => root.render(element));
  return container;
};

const panel = (
  question: EstimandQuestion,
  rows: EstimandLedgerPanel["rows"],
): EstimandLedgerPanel => ({
  question,
  questionLabel: question,
  decisionLabel: "decision",
  methodLabel: "method",
  methodQualifier: "qualifier",
  unitLabel: "unit",
  denominatorLabel: "denominator",
  status: question === "joint-allocation" ? "oracle" : "ok",
  additivity: "sums-to-observed",
  compatibilityKey: question,
  total: 1,
  comparisonTotal: 1,
  rows,
  note: "note",
});

const ledgerWithNegativeChannelOff = (): EstimandLedger => {
  const rows = (
    values: Readonly<Record<ChannelId, number>>,
  ): EstimandLedgerPanel["rows"] =>
    CHANNELS.map((channel) => {
      const value = values[channel];
      return {
        channel,
        value,
        share: null,
        oracleValue: null,
        confidenceInterval: null,
      };
    });

  return {
    credit: panel("credit", rows({ search: 8, social: 5, video: 3 })),
    channelOff: panel("channel-off", rows({ search: -8, social: 4, video: 6 })),
    jointAllocation: panel(
      "joint-allocation",
      rows({ search: 4, social: 3, video: 2 }),
    ),
    comparisonMessage: "comparison",
  };
};

describe("estimand component polish", () => {
  it("renders one zero tick for a negative panel domain", () => {
    const ledger = ledgerWithNegativeChannelOff();
    const container = render(
      React.createElement(EstimandLedgerBoard, {
        ledger,
        selected: "channel-off",
        intervalsPending: false,
      }),
    );

    expect(
      container.querySelectorAll('[data-testid="ledger-zero-tick"]'),
    ).toHaveLength(1);
    expect(
      container.querySelector('[data-testid="ledger-zero-tick"]')?.textContent,
    ).toBe("0");
    expect(
      container.querySelectorAll('[data-testid="intervals-pending"]'),
    ).toHaveLength(0);

    const positiveContainer = render(
      React.createElement(EstimandLedgerBoard, {
        ledger: {
          ...ledger,
          channelOff: {
            ...ledger.channelOff,
            rows: ledger.channelOff.rows.map((row) => ({
              ...row,
              value: row.value === null ? null : Math.abs(row.value),
            })),
          },
        },
        selected: "channel-off",
        intervalsPending: false,
      }),
    );
    expect(
      positiveContainer.querySelectorAll('[data-testid="ledger-zero-tick"]'),
    ).toHaveLength(0);
  });

  it("keeps the pending interval indicator once per panel and outside tracks", () => {
    const container = render(
      React.createElement(EstimandLedgerBoard, {
        ledger: ledgerWithNegativeChannelOff(),
        selected: "channel-off",
        intervalsPending: true,
      }),
    );

    const indicators = container.querySelectorAll(
      '[data-testid="intervals-pending"]',
    );
    expect(indicators).toHaveLength(1);
    expect(indicators[0]?.textContent).toBe("Updating intervals");
    expect(indicators[0]?.closest('[aria-label*="Paid Search"]')).toBeNull();
  });

  it("explains each incorrect decision answer for its own estimand", () => {
    const container = render(React.createElement(DecisionCheck));
    const buttons = Array.from(container.querySelectorAll("button"));
    const liveRegion = container.querySelector('[aria-live="polite"]');
    if (!liveRegion || buttons.length !== 3)
      throw new Error("Decision check did not render");
    const events: CustomEvent[] = [];
    const listener = (event: Event): void => {
      if (event instanceof CustomEvent) events.push(event);
    };
    window.addEventListener("luneburn:lab-event", listener);

    act(() =>
      buttons[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    const creditMessage = liveRegion.textContent;
    expect(creditMessage).toContain(
      "recorded journeys under the current exposure process",
    );
    expect(creditMessage).toContain(
      "that credit share cannot forecast the intervention",
    );
    expect(events[0]?.detail).toEqual({
      name: "decision_check_answered",
      page: "estimands",
      detail: { answer: "credit", correct: false },
    });

    act(() =>
      buttons[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    expect(liveRegion.textContent).toContain("Decision-aligned.");
    expect(events[1]?.detail).toEqual({
      name: "decision_check_answered",
      page: "estimands",
      detail: { answer: "channel-off", correct: true },
    });

    act(() =>
      buttons[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    const allocationMessage = liveRegion.textContent;
    expect(allocationMessage).toContain("allocation convention");
    expect(allocationMessage).toContain(
      "marginal effect of turning one channel off",
    );
    expect(allocationMessage).not.toBe(creditMessage);
    expect(events[2]?.detail).toEqual({
      name: "decision_check_answered",
      page: "estimands",
      detail: { answer: "joint-allocation", correct: false },
    });
    window.removeEventListener("luneburn:lab-event", listener);
  });

  it("supports roving tab focus and APG arrow, Home, and End keys", () => {
    const Harness = (): React.ReactElement => {
      const [value, setValue] = useState<EstimandQuestion>("credit");
      return React.createElement(QuestionSelector, {
        value,
        onChange: setValue,
      });
    };
    const container = render(React.createElement(Harness));
    expect(
      container
        .querySelector('[role="radiogroup"]')
        ?.getAttribute("aria-label"),
    ).toBe("Measurement question");
    expect(
      container.querySelectorAll('[role="radio"][aria-checked="true"]'),
    ).toHaveLength(1);
    const buttons = (): HTMLButtonElement[] => {
      const found = Array.from(container.querySelectorAll("button"));
      if (
        !found.every(
          (button): button is HTMLButtonElement =>
            button instanceof HTMLButtonElement,
        )
      ) {
        throw new Error("Question selector did not render buttons");
      }
      return found;
    };

    expect(buttons().map((button) => button.tabIndex)).toEqual([0, -1, -1]);
    act(() => {
      buttons()[0]?.focus();
      buttons()[0]?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });
    expect(buttons().map((button) => button.tabIndex)).toEqual([-1, 0, -1]);
    expect(document.activeElement).toBe(buttons()[1]);
    expect(buttons()[1]?.getAttribute("aria-checked")).toBe("true");

    act(() =>
      buttons()[1]?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      ),
    );
    expect(buttons().map((button) => button.tabIndex)).toEqual([0, -1, -1]);
    expect(document.activeElement).toBe(buttons()[0]);

    act(() =>
      buttons()[0]?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "End", bubbles: true }),
      ),
    );
    expect(buttons().map((button) => button.tabIndex)).toEqual([-1, -1, 0]);
    expect(document.activeElement).toBe(buttons()[2]);

    act(() =>
      buttons()[2]?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Home", bubbles: true }),
      ),
    );
    expect(buttons().map((button) => button.tabIndex)).toEqual([0, -1, -1]);
    expect(document.activeElement).toBe(buttons()[0]);
  });
});
