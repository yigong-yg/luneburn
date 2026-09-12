import type { EstimandLedgerRow } from "./ledger";
import type { ChannelId } from "./types";

export const firstSignFlipChannel = (
  rows: ReadonlyArray<EstimandLedgerRow>,
): ChannelId | null =>
  rows.find(
    (row) =>
      row.value !== null &&
      row.oracleValue !== null &&
      row.value * row.oracleValue < 0,
  )?.channel ?? null;
