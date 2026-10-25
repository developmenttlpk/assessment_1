import { EngagementType, MonthKey, PerformanceResponse } from './performance-api.models';

/** User-controlled filters. An empty `costCenters` list means "All". */
export interface DashboardFilters {
  month: MonthKey;
  costCenters: string[];
  engagements: EngagementType[];
}

export interface DashboardState {
// Month whose request/data this state describes. 
  month: MonthKey;
// Last valid response for `month` (may be cached data shown while refreshing or after a failed refresh). 
  response: PerformanceResponse | null;
  loading: boolean;
  error: string | null;
}

export type ValueFormat = 'money' | 'number' | 'count' | 'percent';
export type VarianceStatus = 'favorable' | 'unfavorable' | 'neutral';

export interface SummaryRow {
  key: string;
  label: string;
  format: ValueFormat;
  target: number;
  actual: number;
  variance: number;
// `null` renders as N/A (GP % row). 
  variancePercentage: number | null;
  status: VarianceStatus;
}

export interface CostCenterOption {
// Selectable name: a cost_center label or a merged member name. 
  name: string;
// Identity of the response row this name resolves to. 
  detailKey: string;
// Set when `name` is a member of a merged group rather than the row's own label. 
  mergedInto?: string;
}
