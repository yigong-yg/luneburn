import { useEffect, useMemo, useRef, useState } from "react";
import { emitLabEvent } from "../lib/analytics";
import { buildEstimandLedger } from "../lib/estimands/ledger";
import { estimateMarkovMta } from "../lib/estimands/markovMta";
import { estimateMmmLite, type MmmLiteResult } from "../lib/estimands/mmmLite";
import {
  estimandLabDefaults,
  generateEstimandLab,
  toMmmObservedData,
  toMtaObservedData,
} from "../lib/estimands/multichannelDgp";
import {
  estimandLabUrlDefaults,
  parseEstimandHash,
  serializeEstimandHash,
  type EstimandLabUrlState,
} from "../lib/estimands/urlState";
import type { EstimandQuestion } from "../lib/estimands/ledger";
import {
  deriveScenarioDiagnostics,
  type EstimandScenarioDiagnostics,
} from "../lib/estimands/scenarioDiagnostics";

const readInitialState = (): EstimandLabUrlState =>
  typeof window === "undefined"
    ? estimandLabUrlDefaults
    : parseEstimandHash(window.location.hash);

const nextSeed = (seed: number): number => (seed * 48_271) % 999_983 || 1;

const controlBucket = (
  value: number,
  minimum: number,
  maximum: number,
): "low" | "medium" | "high" => {
  const share = (value - minimum) / (maximum - minimum);
  return share < 1 / 3 ? "low" : share < 2 / 3 ? "medium" : "high";
};

export interface EstimandLabController {
  readonly state: EstimandLabUrlState;
  readonly dataset: ReturnType<typeof generateEstimandLab>;
  readonly mta: ReturnType<typeof estimateMarkovMta>;
  readonly mmm: MmmLiteResult;
  readonly scenarioDiagnostics: EstimandScenarioDiagnostics;
  readonly ledger: ReturnType<typeof buildEstimandLedger>;
  readonly intervalsPending: boolean;
  readonly setQuestion: (question: EstimandQuestion) => void;
  readonly setDemandCapture: (value: number) => void;
  readonly setSynergy: (value: number) => void;
  readonly setNoiseStd: (value: number) => void;
  readonly regenerate: () => void;
  readonly reset: () => void;
}

export const useEstimandLab = (): EstimandLabController => {
  const [state, setState] = useState<EstimandLabUrlState>(readInitialState);
  const previousControls = useRef({
    demandCapture: state.demandCapture,
    synergy: state.synergy,
    noiseStd: state.noiseStd,
  });

  const dataset = useMemo(
    () =>
      generateEstimandLab(
        {
          ...estimandLabDefaults,
          demandCapture: state.demandCapture,
          synergy: state.synergy,
          noiseStd: state.noiseStd,
        },
        state.seed,
      ),
    [state.demandCapture, state.noiseStd, state.seed, state.synergy],
  );
  const mta = useMemo(
    () => estimateMarkovMta(toMtaObservedData(dataset)),
    [dataset],
  );
  const pointMmm = useMemo(
    () =>
      estimateMmmLite(toMmmObservedData(dataset), {
        bootstrapReplications: 0,
      }),
    [dataset],
  );
  const [mmm, setMmm] = useState<MmmLiteResult>(pointMmm);
  const [intervalsPending, setIntervalsPending] = useState(true);

  useEffect(() => {
    setMmm(pointMmm);
    setIntervalsPending(true);
    const timeout = window.setTimeout(() => {
      setMmm(
        estimateMmmLite(toMmmObservedData(dataset), {
          bootstrapReplications: 80,
          bootstrapSeed: state.seed + 8_071,
        }),
      );
      setIntervalsPending(false);
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [dataset, pointMmm, state.seed]);

  useEffect(() => {
    const nextHash = serializeEstimandHash(state);
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
  }, [state]);

  useEffect(() => {
    emitLabEvent({ name: "lab_page_view", page: "estimands", detail: {} });
  }, []);

  useEffect(() => {
    const prior = previousControls.current;
    const changes: ReadonlyArray<readonly [string, string]> = [
      ...(prior.demandCapture === state.demandCapture
        ? []
        : [
            [
              "demand_capture",
              controlBucket(state.demandCapture, 0, 0.9),
            ] as const,
          ]),
      ...(prior.synergy === state.synergy
        ? []
        : [
            ["search_video_synergy", controlBucket(state.synergy, 0, 0.8)] as const,
          ]),
      ...(prior.noiseStd === state.noiseStd
        ? []
        : [["outcome_noise", controlBucket(state.noiseStd, 0.2, 2)] as const]),
    ];
    previousControls.current = {
      demandCapture: state.demandCapture,
      synergy: state.synergy,
      noiseStd: state.noiseStd,
    };

    const timeouts = changes.map(([control, bucket]) =>
      window.setTimeout(() => {
        emitLabEvent({
          name: "estimand_control_commit",
          page: "estimands",
          detail: { control, bucket },
        });
      }, 500),
    );
    return () => timeouts.forEach((timeout) => window.clearTimeout(timeout));
  }, [state.demandCapture, state.noiseStd, state.synergy]);

  const update = (patch: Partial<EstimandLabUrlState>): void =>
    setState((current) => ({ ...current, ...patch }));

  const setQuestion = (question: EstimandQuestion): void => {
    update({ question });
    emitLabEvent({
      name: "estimand_question_change",
      page: "estimands",
      detail: { question },
    });
  };

  const regenerate = (): void => {
    setState((current) => ({ ...current, seed: nextSeed(current.seed) }));
    emitLabEvent({
      name: "estimand_control_commit",
      page: "estimands",
      detail: { control: "seed", bucket: "regenerated" },
    });
  };

  const reset = (): void => setState(estimandLabUrlDefaults);
  const scenarioDiagnostics = useMemo(
    () => deriveScenarioDiagnostics(dataset.params),
    [dataset.params],
  );
  const ledger = useMemo(
    () => buildEstimandLedger(dataset, mta, mmm),
    [dataset, mmm, mta],
  );

  return {
    state,
    dataset,
    mta,
    mmm,
    scenarioDiagnostics,
    ledger,
    intervalsPending,
    setQuestion,
    setDemandCapture: (value) => update({ demandCapture: value }),
    setSynergy: (value) => update({ synergy: value }),
    setNoiseStd: (value) => update({ noiseStd: value }),
    regenerate,
    reset,
  };
};
