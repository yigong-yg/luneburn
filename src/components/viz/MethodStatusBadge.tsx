import type { EstimationStatus } from "../../lib/methods/types";

interface MethodStatusBadgeProps {
  readonly status: EstimationStatus;
}

const labelByStatus: Readonly<Record<EstimationStatus, string>> = {
  ok: "OK",
  warning: "Warning",
  invalid: "Invalid",
};

export const MethodStatusBadge = ({
  status,
}: MethodStatusBadgeProps): JSX.Element => {
  const className =
    status === "ok"
      ? "border-[#009E73]/40 bg-[#009E73]/10 text-[#045D45]"
      : status === "warning"
        ? "border-lunar-warning/50 bg-lunar-warning/10 text-[#7A4A00]"
        : "border-lunar-muted/40 bg-lunar-muted/10 text-lunar-muted";

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold uppercase ${className}`}
    >
      {labelByStatus[status]}
    </span>
  );
};
