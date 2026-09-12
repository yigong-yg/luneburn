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
    "keeps a visible sign flip explained at demand capture %s without claiming confounding is its only cause",
    (demandCapture) => {
      const dataset = generateEstimandLab(
        { ...estimandLabDefaults, demandCapture },
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
      expect(video?.value).toBeLessThan(0);
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
      expect(html).toContain("Regression estimates can");
      expect(html).toContain("Video");
      expect(html).not.toContain("Confounded regressions");
    },
  );
});
