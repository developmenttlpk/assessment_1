import { SEPTEMBER, deepFreeze, detail, tables } from '../../testing/fixtures';
import { SummaryRow } from '../models/dashboard.models';
import { PerformanceResponse } from '../models/performance-api.models';
import { aggregateTotals, buildSummaryRows, round2 } from './aggregation';
import { resolveSelectedDetails } from './cost-centers';

function row(rows: SummaryRow[], key: string): SummaryRow {
  const found = rows.find((r) => r.key === key);
  if (!found) throw new Error(`missing row ${key}`);
  return found;
}

function rowsFor(response: PerformanceResponse, centers: string[], engagements: ('Own' | 'Rented' | 'Hired')[] = []) {
  return buildSummaryRows(aggregateTotals(resolveSelectedDetails(response.data.details, centers), engagements));
}

describe('aggregation', () => {
  it('produces the 10 dashboard metrics in order', () => {
    expect(rowsFor(SEPTEMBER, []).map((r) => r.label)).toEqual([
      'Revenue',
      'Gross Profit',
      'GP %',
      'Fuel Cost',
      'Toll Cost',
      'Other Costs',
      'Repair Cost',
      'Budgeted KMs',
      'Approved KMs',
      'Number of Trips',
    ]);
  });

  describe('multi-center aggregation', () => {
    it('sums target and actual across selected centers before computing variance', () => {
      const rows = rowsFor(SEPTEMBER, ['CITY PARCEL HUB', 'NORTHLINE CONTRACT']);

      const revenue = row(rows, 'revenue');
      expect(revenue.target).toBe(723267.2); // 309787 + 413480.2
      expect(revenue.actual).toBe(720139.54); // 293126.83 + 427012.71
      expect(revenue.variance).toBe(-3127.66);
      expect(revenue.variancePercentage).toBe(-0.43);
      expect(revenue.status).toBe('unfavorable');

      const fuel = row(rows, 'fuel_cost');
      expect(fuel.target).toBe(188049.47);
      expect(fuel.actual).toBe(197037.28);
      expect(fuel.variance).toBe(-8987.81); // cost: target − actual
      expect(fuel.status).toBe('unfavorable');

      const trips = row(rows, 'trips');
      expect(trips.target).toBe(272);
      expect(trips.actual).toBe(289);
      expect(trips.status).toBe('favorable');
    });

    it('matches the report totals when All is selected with combined tables', () => {
      const revenue = row(rowsFor(SEPTEMBER, []), 'revenue');
      expect(revenue.target).toBe(3714408);
      expect(revenue.actual).toBe(3534933.57);
    });

    it('ignores source variance and percentage fields', () => {
      const rows = buildSummaryRows(aggregateTotals([detail('X', tables({ revenue: [100, 110] }))], []));
      expect(row(rows, 'revenue').variance).toBe(10);
      expect(row(rows, 'revenue').variancePercentage).toBe(10);
    });
  });

  describe('zero-target calculations', () => {
    it('shows 0.00% variance without suppressing the absolute variance', () => {
      const rows = buildSummaryRows(
        aggregateTotals([detail('Z', tables({ revenue: [0, 250.5], other_costs: [0, 40] }))], []),
      );
      expect(row(rows, 'revenue').variance).toBe(250.5);
      expect(row(rows, 'revenue').variancePercentage).toBe(0);
      expect(row(rows, 'revenue').status).toBe('favorable');

      expect(row(rows, 'other_costs').variance).toBe(-40);
      expect(row(rows, 'other_costs').variancePercentage).toBe(0);
      expect(row(rows, 'other_costs').status).toBe('unfavorable');
    });

    it('treats exact zero variance as neutral', () => {
      const rows = buildSummaryRows(aggregateTotals([detail('N', tables({ toll_cost: [50, 50] }))], []));
      expect(row(rows, 'toll_cost').variance).toBe(0);
      expect(row(rows, 'toll_cost').status).toBe('neutral');
    });

    it('uses 0 for GP % when revenue is zero', () => {
      const rows = buildSummaryRows(aggregateTotals([detail('R', tables({ revenue: [0, 0], gp: [100, 50] }))], []));
      expect(row(rows, 'gp_percentage').target).toBe(0);
      expect(row(rows, 'gp_percentage').actual).toBe(0);
    });
  });

  describe('derived GP and GP %', () => {
    it('applies the GP adjustment and derives GP % for target and actual separately', () => {
      const rows = buildSummaryRows(
        aggregateTotals([detail('G', tables({ revenue: [1000, 2000], gp: [500, 900] }))], []),
      );
      const gp = row(rows, 'gp');
      expect(gp.target).toBe(419.5); // 500 − 1000 × 1.15 × 0.07
      expect(gp.actual).toBe(739); // 900 − 2000 × 1.15 × 0.07
      expect(gp.variance).toBe(319.5);
      expect(gp.variancePercentage).toBe(76.16);

      const gpPct = row(rows, 'gp_percentage');
      expect(gpPct.target).toBe(41.95);
      expect(gpPct.actual).toBe(36.95);
      expect(gpPct.variance).toBe(-5); // percentage points
      expect(gpPct.variancePercentage).toBeNull(); // rendered as N/A
      expect(gpPct.status).toBe('unfavorable');
    });

    it('derives GP % from aggregated values rather than summing or averaging source percentages', () => {
      const a = detail('A', tables({ revenue: [100, 100], gp: [50, 50], gp_percentage: [50, 50] }));
      const b = detail('B', tables({ revenue: [300, 300], gp: [30, 30], gp_percentage: [10, 10] }));
      const gpPct = row(buildSummaryRows(aggregateTotals([a, b], [])), 'gp_percentage');
      // (80 − 400 × 0.0805) / 400 × 100 = 11.95; neither 60 (sum) nor 30 (average)
      expect(gpPct.actual).toBe(11.95);
    });
  });

  describe('engagement filters', () => {
    it('All + Own aggregates Own tables across every center instead of using data.report', () => {
      const rows = rowsFor(SEPTEMBER, [], ['Own']);
      const expectedTarget = round2(
        SEPTEMBER.data.details.reduce((sum, d) => sum + (d.engagement_tables?.Own?.revenue?.total.target ?? 0), 0),
      );
      expect(row(rows, 'revenue').target).toBe(expectedTarget);
      expect(row(rows, 'revenue').target).not.toBe(3714408);
    });

    it('combines multiple engagement types with multiple centers', () => {
      const rows = rowsFor(SEPTEMBER, ['CITY PARCEL HUB', 'NORTHLINE CONTRACT'], ['Own', 'Hired']);
      // CPH Own 84916 + Hired 122148.4, NLC Own 116582.4 + Hired 159610.8
      expect(row(rows, 'revenue').target).toBe(483257.6);
      expect(row(rows, 'revenue').actual).toBe(round2(81635.61 + 105173.94 + 141585.98 + 159683.19));
    });

    it('Own + Rented + Hired reproduces the combined revenue totals', () => {
      const split = row(rowsFor(SEPTEMBER, [], ['Own', 'Rented', 'Hired']), 'revenue');
      const combined = row(rowsFor(SEPTEMBER, []), 'revenue');
      expect(split.target).toBe(combined.target);
      expect(split.actual).toBe(combined.actual);
    });

    it('a center without the selected engagement table contributes nothing', () => {
      const totals = aggregateTotals([detail('E', tables({ revenue: [10, 10] }))], ['Own']);
      expect(totals.revenue).toEqual({ target: 0, actual: 0 });
    });
  });

  it('does not mutate the API response', () => {
    const frozen = deepFreeze(structuredClone(SEPTEMBER));
    const before = JSON.stringify(frozen);
    expect(() => rowsFor(frozen, ['CENTRAL FLEET EAST', 'CITY PARCEL HUB'], ['Own', 'Rented'])).not.toThrow();
    expect(JSON.stringify(frozen)).toBe(before);
  });
});
