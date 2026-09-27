import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EstimandCurrentRead } from "../../src/components/estimands/EstimandCurrentRead";
import { buildEstimandLedger } from "../../src/lib/estimands/ledger";
import { estimateMarkovMta } from "../../src/lib/estimands/markovMta";
import { estimateMmmLite } from "../../src/lib/estimands/mmmLite";
import {
  estimandLabDefaults,
  generateEstimandLab,
  toMmmObservedData,
  toMtaObservedData,
} from "../../src/lib/estimands/multichannelDgp";
import { deriveScenarioDiagnostics } from "../../src/lib/estimands/scenarioDiagnostics";

describe("sign-flip explanation on computed data", () => {
  it.each([0, 0.68])(
    "does not invent a Video sign flip after media-plan calibration at demand capture %s",
    (demandCapture) => {
      const dataset = generateEstimandLab(
        {
          ...estimandLabDefaults,
          demandCapture,
          synergy: demandCapture === 0 ? 0 : estimandLabDefaults.synergy,
        },
        2307,
      );
      const mta = estimateMarkovMta(toMtaObservedData(dataset));
      const mmm = estimateMmmLite(toMmmObservedData(dataset), {
        bootstrapReplications: 0,
      });
      const ledger = buildEstimandLedger(dataset, mta, mmm);
      const video = ledger.channelOff.rows.find(
        (row) => row.channel === "video",
      );
      expect(video?.value).toBeGreaterThan(0);
      expect(video?.oracleValue).toBeGreaterThan(0);

      const html = renderToStaticMarkup(
        createElement(EstimandCurrentRead, {
          dataset,
          ledger,
          mta,
          mmm,
          scenarioDiagnostics: deriveScenarioDiagnostics(dataset.params),
        }),
      );
      expect(html).not.toContain("opposite sign");
      expect(html).not.toContain("Confounded regressions");
      if (dataset.params.synergy === 0) {
        expect(html).toContain("no structural Search x Video interaction");
        expect(ledger.channelOff.note).toContain(
          "realized paired conversion counts",
        );
      }

      // Exercise the rendering branch explicitly, independent of calibration.
      const signFlippedLedger = {
        ...ledger,
        channelOff: {
          ...ledger.channelOff,
          rows: ledger.channelOff.rows.map((row) =>
            row.channel === "video"
              ? { ...row, value: -(row.oracleValue ?? 1) }
              : row,
          ),
        },
      };
      const signFlipHtml = renderToStaticMarkup(
        createElement(EstimandCurrentRead, {
          dataset,
          ledger: signFlippedLedger,
          mta,
          mmm,
          scenarioDiagnostics: deriveScenarioDiagnostics(dataset.params),
        }),
      );
      expect(signFlipHtml).toContain("Video estimate has the opposite sign");
      expect(signFlipHtml).toContain("estimation error within one target");
      expect(signFlipHtml).not.toContain("correlated media");
    },
  );
});
