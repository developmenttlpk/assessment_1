import { DashboardFilters } from '../models/dashboard.models';
import { ENGAGEMENT_TYPES, EngagementType, MonthKey } from '../models/performance-api.models';

export const MONTHS: readonly { key: MonthKey; label: string }[] = [
  { key: '2026-09', label: 'September 2026' },
  { key: '2026-10', label: 'October 2026' },
];

export const DEFAULT_FILTERS: DashboardFilters = { month: '2026-10', costCenters: [], engagements: [] };

// Toggling an individual center implicitly deselects All; removing the last one returns to All
// (empty list). 
export function toggleCostCenter(selected: readonly string[], name: string): string[] {
  return selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name];
}

// Engagement filters are independent; the result keeps a canonical order so either click order 
// yields the same filter. 
export function toggleEngagement(selected: readonly EngagementType[], type: EngagementType): EngagementType[] {
  const next = selected.includes(type) ? selected.filter((t) => t !== type) : [...selected, type];
  return ENGAGEMENT_TYPES.filter((t) => next.includes(t));
}

export function isMonthKey(value: unknown): value is MonthKey {
  return MONTHS.some((m) => m.key === value);
}

// Validates untrusted persisted data, falling back to defaults field by field.
export function sanitizeFilters(raw: unknown): DashboardFilters {
  if (typeof raw !== 'object' || raw === null) {
    return { ...DEFAULT_FILTERS };
  }
  const candidate = raw as Record<string, unknown>;
  const month = isMonthKey(candidate['month']) ? candidate['month'] : DEFAULT_FILTERS.month;
  const costCenters = Array.isArray(candidate['costCenters'])
    ? [...new Set(candidate['costCenters'].filter((n): n is string => typeof n === 'string'))]
    : [];
  const engagements = Array.isArray(candidate['engagements'])
    ? ENGAGEMENT_TYPES.filter((t) => (candidate['engagements'] as unknown[]).includes(t))
    : [];
  return { month, costCenters, engagements };
}
