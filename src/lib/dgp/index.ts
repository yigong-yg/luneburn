import type { DGP, DGPParams } from "./types";
import {
  buildCommerceStubState,
  commerceChannelLaunchDgp,
} from "./commerceChannelLaunch";
import { buildSuperBowlStubState, superBowlDgp } from "./superBowl";
import type { StubScenarioState } from "./stubHelpers";

export const dgps: ReadonlyArray<DGP> = [
  superBowlDgp,
  commerceChannelLaunchDgp,
];

export const dgpById: ReadonlyMap<string, DGP> = new Map(
  dgps.map((dgp) => [dgp.id, dgp]),
);

export const getDgp = (scenarioId: string): DGP =>
  dgpById.get(scenarioId) ?? superBowlDgp;

const stubBuilders: ReadonlyMap<
  string,
  (params: DGPParams, seed: number) => StubScenarioState
> = new Map([
  [superBowlDgp.id, buildSuperBowlStubState],
  [commerceChannelLaunchDgp.id, buildCommerceStubState],
]);

const getStubBuilder = (
  scenarioId: string,
): ((params: DGPParams, seed: number) => StubScenarioState) =>
  stubBuilders.get(scenarioId) ?? buildSuperBowlStubState;

export const buildScenarioState = (
  scenarioId: string,
  seed: number,
): StubScenarioState => {
  const dgp = getDgp(scenarioId);
  return getStubBuilder(dgp.id)(dgp.defaultParams, seed);
};

export const buildScenarioStateFromParams = (
  scenarioId: string,
  params: DGPParams,
  seed: number,
): StubScenarioState => {
  const dgp = getDgp(scenarioId);
  return getStubBuilder(dgp.id)(params, seed);
};
