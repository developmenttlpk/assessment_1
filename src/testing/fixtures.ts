import septJson from '../app/data/fixtures/mock-performance-2026-09.json';
import octJson from '../app/data/fixtures/mock-performance-2026-10.json';
import { CostCenterDetail, MetricTables, MonthKey, PerformanceResponse } from '../app/models/performance-api.models';

export const SEPTEMBER = septJson as unknown as PerformanceResponse;
export const OCTOBER = octJson as unknown as PerformanceResponse;

export const FIXTURES: Record<MonthKey, PerformanceResponse> = { '2026-09': SEPTEMBER, '2026-10': OCTOBER };

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

// Builds a minimal table set; unspecified metrics are omitted.
export function tables(values: Partial<Record<keyof MetricTables, [target: number, actual: number]>>): MetricTables {
  const result: MetricTables = {};
  for (const [key, pair] of Object.entries(values) as [keyof MetricTables, [number, number]][]) {
    const [target, actual] = pair;
    // Source variance fields are deliberately wrong to prove they are ignored.
    result[key] = { label: key, rows: [], total: { target, actual, variance: 999, variance_percentage: 999 } };
  }
  return result;
}

export function detail(costCenter: string, combined: MetricTables, extra: Partial<CostCenterDetail> = {}): CostCenterDetail {
  return { cost_center: costCenter, cost_code: costCenter.slice(0, 3), tables: combined, ...extra };
}
