import { mulberry32 } from "./random";

export const movingBlockIndices = (
  length: number,
  blockLength: number,
  seed: number,
): number[] => {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error("bootstrap length must be a positive integer");
  }
  if (
    !Number.isInteger(blockLength) ||
    blockLength <= 0 ||
    blockLength > length
  ) {
    throw new Error("block length must be between 1 and the series length");
  }

  const rng = mulberry32(seed);
  const maximumStart = length - blockLength;
  const indices: number[] = [];

  while (indices.length < length) {
    const start = Math.floor(rng() * (maximumStart + 1));
    for (
      let offset = 0;
      offset < blockLength && indices.length < length;
      offset += 1
    ) {
      indices.push(start + offset);
    }
  }

  return indices;
};
