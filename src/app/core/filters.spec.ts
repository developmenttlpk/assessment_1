import { DEFAULT_FILTERS, sanitizeFilters, toggleCostCenter, toggleEngagement } from './filters';

describe('filter transitions', () => {
  it('selecting an individual center leaves All; removing the last returns to All', () => {
    let selected = toggleCostCenter([], 'A'); // All -> [A]
    expect(selected).toEqual(['A']);
    selected = toggleCostCenter(selected, 'B');
    expect(selected).toEqual(['A', 'B']);
    selected = toggleCostCenter(toggleCostCenter(selected, 'A'), 'B');
    expect(selected).toEqual([]); // empty === All
  });

  it('engagement toggles are independent and order-insensitive', () => {
    const hiredThenOwn = toggleEngagement(toggleEngagement([], 'Hired'), 'Own');
    const ownThenHired = toggleEngagement(toggleEngagement([], 'Own'), 'Hired');
    expect(hiredThenOwn).toEqual(['Own', 'Hired']);
    expect(ownThenHired).toEqual(hiredThenOwn);
    expect(toggleEngagement(hiredThenOwn, 'Own')).toEqual(['Hired']);
  });

  it('sanitizes persisted values', () => {
    expect(sanitizeFilters(null)).toEqual(DEFAULT_FILTERS);
    expect(sanitizeFilters({ month: '2025-01', costCenters: ['A', 3, 'A'], engagements: ['Hired', 'Bogus', 'Own'] })).toEqual({
      month: DEFAULT_FILTERS.month,
      costCenters: ['A'],
      engagements: ['Own', 'Hired'],
    });
  });
});
