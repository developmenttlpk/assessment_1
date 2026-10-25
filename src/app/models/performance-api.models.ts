/** Shapes of the mock performance API response (data.report / data.details). */

export type MonthKey = '2026-09' | '2026-10';

export const ENGAGEMENT_TYPES = ['Own', 'Rented', 'Hired'] as const;
export type EngagementType = (typeof ENGAGEMENT_TYPES)[number];

export type TableMetricKey =
  | 'revenue'
  | 'gp'
  | 'fuel_cost'
  | 'toll_cost'
  | 'freight_charges'
  | 'loading_unloading_charges'
  | 'other_costs'
  | 'repair_cost'
  | 'rental_cost'
  | 'transportation_income'
  | 'budgeted_km'
  | 'approved_km'
  | 'trips'
  | 'gp_percentage';

export interface ReportKpi {
  target: number;
  actual: number;
  variance: number;
  variance_pct: number;
  status: 'GOOD' | 'BAD' | string;
}

export interface PerformanceReport {
  date: string;
  total_month_days: number;
  /** Spelling matches the API payload. */
  total_daays_passed: number;
  [metric: string]: ReportKpi | string | number;
}

export interface VehicleRow {
  vehicle_no: string;
  category: string;
  target: number;
  actual: number;
  variance: number;
  actualKms?: number;
  fuel_liters?: number;
}

export interface MetricTotal {
  target: number;
  actual: number;
  variance: number;
  variance_percentage: number;
  actualKms?: number;
  totalfuelltr?: number;
}

export interface MetricTable {
  label: string;
  rows: VehicleRow[];
  total: MetricTotal;
}

export type MetricTables = Partial<Record<TableMetricKey, MetricTable>>;

export interface CostCenterDetail {
  cost_center: string;
  cost_code: string;
  tables: MetricTables;
  engagement_tables?: Partial<Record<EngagementType, MetricTables>>;
  merged_group_costcenters?: string[];
  merge_group_id?: number;
}

export interface PerformanceData {
  report: PerformanceReport;
  details: CostCenterDetail[];
}

export interface PerformanceResponse {
  status: number;
  message: string;
  data: PerformanceData;
}
