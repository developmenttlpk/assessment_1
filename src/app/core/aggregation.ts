import { SummaryRow, ValueFormat, VarianceStatus } from '../models/dashboard.models';
import { CostCenterDetail, EngagementType, MetricTables, TableMetricKey } from '../models/performance-api.models';

//  adjustedGP = rawGP − (revenue × 1.15 × 0.07)
export const GP_ADJUSTMENT_FACTOR = 1.15 * 0.07;

export interface TargetActual {
  target: number;
  actual: number;
}

type Direction = 'higher-is-better' | 'lower-is-better';

interface MetricDefinition {
  key: TableMetricKey;
  label: string;
  format: ValueFormat;
  direction: Direction;
}

// Metrics summed from source totals (GP % is derived, never summed).
export const SUMMED_METRICS = [
  'revenue',
  'gp',
  'fuel_cost',
  'toll_cost',
  'other_costs',
  'repair_cost',
  'budgeted_km',
  'approved_km',
  'trips',
] as const satisfies readonly TableMetricKey[];

export type SummedMetric = (typeof SUMMED_METRICS)[number];
export type AggregatedTotals = Record<SummedMetric, TargetActual>;

const METRICS: Record<Exclude<SummedMetric, 'gp'>, MetricDefinition> = {
  revenue: { key: 'revenue', label: 'Revenue', format: 'money', direction: 'higher-is-better' },
  fuel_cost: { key: 'fuel_cost', label: 'Fuel Cost', format: 'money', direction: 'lower-is-better' },
  toll_cost: { key: 'toll_cost', label: 'Toll Cost', format: 'money', direction: 'lower-is-better' },
  other_costs: { key: 'other_costs', label: 'Other Costs', format: 'money', direction: 'lower-is-better' },
  repair_cost: { key: 'repair_cost', label: 'Repair Cost', format: 'money', direction: 'lower-is-better' },
  budgeted_km: { key: 'budgeted_km', label: 'Budgeted KMs', format: 'number', direction: 'higher-is-better' },
  approved_km: { key: 'approved_km', label: 'Approved KMs', format: 'number', direction: 'higher-is-better' },
  trips: { key: 'trips', label: 'Number of Trips', format: 'count', direction: 'higher-is-better' },
};

export function round2(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

//  Picks the metric tables a detail contributes: combined `tables` when no engagement filter is
//  active, otherwise only the selected `engagement_tables` entries.
 
export function selectTables(detail: CostCenterDetail, engagements: readonly EngagementType[]): MetricTables[] {
  if (engagements.length === 0) {
    return [detail.tables];
  }
  return engagements
    .map((type) => detail.engagement_tables?.[type])
    .filter((tables): tables is MetricTables => tables !== undefined);
}

// Sums raw target and actual totals across details (and selected engagement types).
// Inputs are never mutated.
export function aggregateTotals(
  details: readonly CostCenterDetail[],
  engagements: readonly EngagementType[],
): AggregatedTotals {
  const totals = Object.fromEntries(SUMMED_METRICS.map((m) => [m, { target: 0, actual: 0 }])) as AggregatedTotals;

  for (const detail of details) {
    for (const tables of selectTables(detail, engagements)) {
      for (const metric of SUMMED_METRICS) {
        const total = tables[metric]?.total;
        if (total) {
          totals[metric].target += total.target ?? 0;
          totals[metric].actual += total.actual ?? 0;
        }
      }
    }
  }
  return totals;
}

export function adjustedGp(rawGp: number, revenue: number): number {
  return rawGp - revenue * GP_ADJUSTMENT_FACTOR;
}

export function gpPercentage(adjustedGpValue: number, revenue: number): number {
  return revenue === 0 ? 0 : (adjustedGpValue / revenue) * 100;
}

export function statusOf(variance: number): VarianceStatus {
  if (variance > 0) return 'favorable';
  if (variance < 0) return 'unfavorable';
  return 'neutral';
}

// Builds a display row. Target/actual are rounded to display precision first, then variance,
// variance % and status are recomputed from those displayed values

function buildRow(
  key: string,
  label: string,
  format: ValueFormat,
  direction: Direction,
  values: TargetActual,
): SummaryRow {
  const target = round2(values.target);
  const actual = round2(values.actual);
  const variance = round2(direction === 'higher-is-better' ? actual - target : target - actual);
  const variancePercentage = target === 0 ? 0 : round2((variance / target) * 100);
  return { key, label, format, target, actual, variance, variancePercentage, status: statusOf(variance) };
}

// Produces the 10 dashboard rows from aggregated totals.

export function buildSummaryRows(totals: AggregatedTotals): SummaryRow[] {
  const revenue = { target: round2(totals.revenue.target), actual: round2(totals.revenue.actual) };
  const rawGp = { target: round2(totals.gp.target), actual: round2(totals.gp.actual) };
  const adjusted = {
    target: round2(adjustedGp(rawGp.target, revenue.target)),
    actual: round2(adjustedGp(rawGp.actual, revenue.actual)),
  };
  const gpPct = {
    target: round2(gpPercentage(adjusted.target, revenue.target)),
    actual: round2(gpPercentage(adjusted.actual, revenue.actual)),
  };
  const gpPctVariance = round2(gpPct.actual - gpPct.target);

  const simple = (metric: Exclude<SummedMetric, 'gp'>): SummaryRow => {
    const def = METRICS[metric];
    return buildRow(def.key, def.label, def.format, def.direction, totals[metric]);
  };

  return [
    simple('revenue'),
    buildRow('gp', 'Gross Profit', 'money', 'higher-is-better', adjusted),
    {
      key: 'gp_percentage',
      label: 'GP %',
      format: 'percent',
      target: gpPct.target,
      actual: gpPct.actual,
      variance: gpPctVariance,
      variancePercentage: null,
      status: statusOf(gpPctVariance),
    },
    simple('fuel_cost'),
    simple('toll_cost'),
    simple('other_costs'),
    simple('repair_cost'),
    simple('budgeted_km'),
    simple('approved_km'),
    simple('trips'),
  ];
}
