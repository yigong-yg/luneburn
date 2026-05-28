import type { Dataset, DGP, DGPParams } from "./types";
import {
  buildCommerceStubResults,
  commerceChannelLaunchDgp,
} from "./commerceChannelLaunch";
import { buildSuperBowlStubResults, superBowlDgp } from "./superBowl";
import type { StubScenarioResults, StubScenarioState } from "./stubHelpers";

export const dgps: ReadonlyArray<DGP> = [
  superBowlDgp,
  commerceChannelLaunchDgp,
];

export const dgpById: ReadonlyMap<string, DGP> = new Map(
  dgps.map((dgp) => [dgp.id, dgp]),
);

export const getDgp = (scenarioId: string): DGP =>
  dgpById.get(scenarioId) ?? superBowlDgp;

const stubResultBuilders: ReadonlyMap<
  string,
  (dataset: Dataset, params: DGPParams) => StubScenarioResults
> = new Map([
  [superBowlDgp.id, buildSuperBowlStubResults],
  [commerceChannelLaunchDgp.id, buildCommerceStubResults],
]);

// Session A: datasets are real (Super Bowl) or stubbed (Commerce, deferred), but
// estimator *results* remain stubs until Session B. They derive from the real
// dataset's ground truth so the hero chart stays coherent.
export const buildScenarioResults = (
  scenarioId: string,
  dataset: Dataset,
  params: DGPParams,
): StubScenarioResults => {
  const dgp = getDgp(scenarioId);
  const builder = stubResultBuilders.get(dgp.id) ?? buildSuperBowlStubResults;
  return builder(dataset, params);
};

export const buildScenarioStateFromParams = (
  scenarioId: string,
  params: DGPParams,
  seed: number,
): StubScenarioState => {
  const dgp = getDgp(scenarioId);
  const dataset = dgp.generate(params, seed);
  const { results, headline } = buildScenarioResults(dgp.id, dataset, params);
  return { dataset, results, headline };
};
