export const geometricAdstock = (
  values: ReadonlyArray<number>,
  decay: number,
): number[] => {
  if (!Number.isFinite(decay) || decay < 0 || decay >= 1) {
    throw new Error(`adstock decay must be in [0, 1); received ${decay}`);
  }

  const inputWeight = 1 - decay;
  let carried = 0;

  return values.map((value) => {
    if (!Number.isFinite(value)) {
      throw new Error("adstock values must be finite");
    }
    carried = inputWeight * value + decay * carried;
    return carried;
  });
};
