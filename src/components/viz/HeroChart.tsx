import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HeroChartProps } from "../../types/ui";
import { methodDisplayNames } from "../../lib/methods";
import { MethodStatusBadge } from "./MethodStatusBadge";

interface ChartDatum {
  readonly period: number;
  readonly truth: number;
  readonly naive: number | null;
  readonly reference: number | null;
}

const percent = (value: number | null): string =>
  value === null ? "Not applicable" : `${(value * 100).toFixed(1)}%`;

const referenceColor = (props: HeroChartProps): string =>
  props.hero.narrativeMode === "fails-instructively"
    ? props.palette.stressedReferenceColor
    : props.palette.heroRoleColors["reference-method"];

const toChartData = ({
  groundTruthSeries,
  naiveResult,
  referenceResult,
}: HeroChartProps): ReadonlyArray<ChartDatum> =>
  groundTruthSeries.map((truth, index) => ({
    period: index + 1,
    truth: truth * 100,
    naive: naiveResult.perPeriodEstimate?.[index] ?? null,
    reference: referenceResult.perPeriodEstimate?.[index] ?? null,
  })).map((datum) => ({
    ...datum,
    naive: datum.naive === null ? null : datum.naive * 100,
    reference: datum.reference === null ? null : datum.reference * 100,
  }));

const ciBounds = (
  confidenceInterval: readonly [number, number] | null,
): readonly [number, number] | null =>
  confidenceInterval === null
    ? null
    : [confidenceInterval[0] * 100, confidenceInterval[1] * 100];

export const HeroChart = (props: HeroChartProps): JSX.Element => {
  const { dataset, naiveResult, referenceResult, hero, palette } = props;
  const chartData = [...toChartData(props)];
  const naiveCi = ciBounds(naiveResult.confidenceInterval);
  const referenceCi = ciBounds(referenceResult.confidenceInterval);
  const reference = referenceColor(props);
  const referenceName =
    methodDisplayNames[hero.referenceMethodId] ?? hero.referenceMethodId;
  const naiveName = methodDisplayNames[hero.naiveMethodId] ?? hero.naiveMethodId;

  return (
    <section className="rounded-lg border border-lunar-border bg-lunar-surface p-4 shadow-panel">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-lunar-muted">
            Hero View
          </p>
          <h2 className="mt-1 text-xl font-semibold text-lunar-text md:text-2xl">
            Same campaign. Same truth. Different assumptions.
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <MethodStatusBadge status={naiveResult.status} />
          <MethodStatusBadge status={referenceResult.status} />
        </div>
      </div>

      <div className="mt-4 h-[320px] min-h-[320px] md:h-[430px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 18, right: 18, bottom: 8, left: 0 }}
          >
            <CartesianGrid stroke={palette.ui.border} strokeDasharray="3 6" />
            <XAxis
              dataKey="period"
              tick={{ fill: palette.ui.mutedText, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: palette.ui.border }}
              label={{
                value: "Week",
                position: "insideBottomRight",
                offset: -4,
                fill: palette.ui.mutedText,
                fontSize: 12,
              }}
            />
            <YAxis
              tickFormatter={(value: number) => `${value.toFixed(0)}%`}
              tick={{ fill: palette.ui.mutedText, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: palette.ui.border }}
              width={48}
            />
            <Tooltip
              formatter={(value: number | string, name: string) => [
                typeof value === "number" ? `${value.toFixed(1)}%` : value,
                name,
              ]}
              labelFormatter={(label: number) => `Week ${label}`}
              contentStyle={{
                borderColor: palette.ui.border,
                borderRadius: 8,
                color: palette.ui.text,
              }}
            />
            {naiveCi && (
              <ReferenceArea
                y1={naiveCi[0]}
                y2={naiveCi[1]}
                fill={palette.heroRoleColors["naive-baseline"]}
                fillOpacity={0.08}
                strokeOpacity={0}
              />
            )}
            {referenceCi && (
              <ReferenceArea
                y1={referenceCi[0]}
                y2={referenceCi[1]}
                fill={reference}
                fillOpacity={0.08}
                strokeOpacity={0}
              />
            )}
            <Line
              name="Ground truth"
              type="monotone"
              dataKey="truth"
              stroke={palette.heroRoleColors["ground-truth"]}
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              name={naiveName}
              type="monotone"
              dataKey="naive"
              stroke={palette.heroRoleColors["naive-baseline"]}
              strokeWidth={2.4}
              dot={false}
              strokeDasharray="5 4"
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              name={referenceName}
              type="monotone"
              dataKey="reference"
              stroke={reference}
              strokeWidth={2.6}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid gap-3 border-t border-lunar-border pt-4 sm:grid-cols-3">
        <Readout
          label="Ground truth"
          value={percent(dataset.groundTruth.comparisonEstimand)}
          detail="known synthetic estimand"
          color={palette.heroRoleColors["ground-truth"]}
        />
        <Readout
          label={naiveName}
          value={percent(naiveResult.pointEstimate)}
          detail="naive baseline"
          color={palette.heroRoleColors["naive-baseline"]}
        />
        <Readout
          label={referenceName}
          value={percent(referenceResult.pointEstimate)}
          detail={
            hero.narrativeMode === "fails-instructively"
              ? "reference under stress"
              : "reference method"
          }
          color={reference}
        />
      </div>
    </section>
  );
};

interface ReadoutProps {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly color: string;
}

const Readout = ({
  label,
  value,
  detail,
  color,
}: ReadoutProps): JSX.Element => (
  <div className="min-w-0">
    <div className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <p className="truncate text-sm font-semibold text-lunar-text">{label}</p>
    </div>
    <p className="mt-1 text-2xl font-semibold tabular-nums text-lunar-text">
      {value}
    </p>
    <p className="text-xs font-medium uppercase tracking-wide text-lunar-muted">
      {detail}
    </p>
  </div>
);
