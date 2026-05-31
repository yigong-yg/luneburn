import type { Dataset, DGP, DGPParams } from "./types";
import {
  buildCommerceStubResults,
  commerceChannelLaunchDgp,
} from "./commerceChannelLaunch";
import { superBowlDgp, superBowlHeadline } from "./superBowl";
import type { ScenarioResults, StubScenarioState } from "./stubHelpers";
import { runEstimators } from "../methods";

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
  (dataset: Dataset, params: DGPParams) => ScenarioResults
> = new Map([
  [commerceChannelLaunchDgp.id, buildCommerceStubResults],
]);

const buildRealSuperBowlResults = (dataset: Dataset): ScenarioResults => ({
  results: runEstimators(dataset, [
    superBowlDgp.hero.naiveMethodId,
    superBowlDgp.hero.referenceMethodId,
  ]),
  headline: superBowlHeadline,
});

// Super Bowl now uses real V0 estimators. Commerce remains an explicit
// fails-instructively stub until its real DGP and synthetic-control estimator land.
export const buildScenarioResults = (
  scenarioId: string,
  dataset: Dataset,
  params: DGPParams,
): ScenarioResults => {
  const dgp = getDgp(scenarioId);
  const stubBuilder = stubResultBuilders.get(dgp.id);
  return stubBuilder ? stubBuilder(dataset, params) : buildRealSuperBowlResults(dataset);
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
