import { TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { FIXTURES, OCTOBER, SEPTEMBER } from '../../testing/fixtures';
import { MOCK_API_CONFIG, MockApiConfig } from '../data/mock-performance-api.service';
import { MonthKey } from '../models/performance-api.models';
import { DashboardFiltersStorage, FILTERS_STORAGE_KEY } from './dashboard-filters.storage';
import { DashboardStore } from './dashboard.store';

// Controlled mock latency: September is slow, October is fast.
const DELAYS: Record<MonthKey, number> = { '2026-09': 3000, '2026-10': 300 };

describe('DashboardStore', () => {
  let requests: MonthKey[];
  let fail: boolean;

  beforeEach(() => {
    localStorage.removeItem(FILTERS_STORAGE_KEY);
    requests = [];
    fail = false;
    const config: MockApiConfig = {
      delayMs: (month) => {
        requests.push(month);
        return DELAYS[month];
      },
      shouldFail: () => fail,
      loadFixture: (month) => Promise.resolve(FIXTURES[month]),
    };
    TestBed.configureTestingModule({ providers: [{ provide: MOCK_API_CONFIG, useValue: config }] });
  });

  afterEach(() => localStorage.removeItem(FILTERS_STORAGE_KEY));

  it('never lets a slow September response replace October after switching', fakeAsync(() => {
    const store = TestBed.inject(DashboardStore);

    store.selectMonth('2026-09');
    expect(store.state()).toEqual(jasmine.objectContaining({ month: '2026-09', loading: true }));

    tick(100);
    store.selectMonth('2026-10'); // September still in flight (needs 3000 ms)
    tick(300);
    expect(store.state()).toEqual(
      jasmine.objectContaining({ month: '2026-10', loading: false, error: null, response: jasmine.anything() }),
    );
    expect(store.state().response!.data.report.date).toBe(OCTOBER.data.report.date);

    tick(3000); // well past when September would have resolved
    expect(store.state().month).toBe('2026-10');
    expect(store.state().loading).toBeFalse();
    expect(store.state().response!.data.report.date).toBe(OCTOBER.data.report.date);
    expect(requests).toEqual(['2026-09', '2026-10']);
  }));

  it('a stale failure cannot put October into an error state', fakeAsync(() => {
    const store = TestBed.inject(DashboardStore);
    fail = true;
    store.selectMonth('2026-09');
    tick(50);
    fail = false;
    store.selectMonth('2026-10');
    tick(3000);
    expect(store.state().error).toBeNull();
    expect(store.state().month).toBe('2026-10');
  }));

  it('serves cached months without another request and refresh bypasses the cache', fakeAsync(() => {
    const store = TestBed.inject(DashboardStore);
    store.selectMonth('2026-09');
    tick(3000);
    store.selectMonth('2026-10');
    tick(300);

    store.selectMonth('2026-09');
    expect(store.state()).toEqual(jasmine.objectContaining({ month: '2026-09', loading: false }));
    expect(store.state().response!.data.report.date).toBe(SEPTEMBER.data.report.date);
    expect(requests).toEqual(['2026-09', '2026-10']);

    store.refresh();
    expect(store.state().loading).toBeTrue();
    expect(store.state().response).not.toBeNull(); // cached data stays visible while refreshing
    tick(3000);
    expect(requests).toEqual(['2026-09', '2026-10', '2026-09']);
  }));

  it('keeps the last valid data when a refresh fails', fakeAsync(() => {
    const store = TestBed.inject(DashboardStore);
    store.selectMonth('2026-10');
    tick(300);
    const before = store.rows();

    fail = true;
    store.refresh();
    tick(300);
    expect(store.state().error).toEqual(jasmine.any(String));
    expect(store.state().response!.data.report.date).toBe(OCTOBER.data.report.date);
    expect(store.rows()).toEqual(before);

    // Cache still intact: leaving and returning does not refetch.
    fail = false;
    store.selectMonth('2026-09');
    tick(3000);
    store.selectMonth('2026-10');
    expect(store.state().error).toBeNull();
    expect(requests.length).toBe(3);
  }));

  it('shows an error state when the first load fails', fakeAsync(() => {
    fail = true;
    const store = TestBed.inject(DashboardStore);
    store.init();
    tick(300);
    expect(store.state()).toEqual(jasmine.objectContaining({ loading: false, response: null }));
    expect(store.state().error).toContain('2026-10');
  }));

  it('filters update KPIs without API calls, independent of selection order', fakeAsync(() => {
    const store = TestBed.inject(DashboardStore);
    store.selectMonth('2026-09');
    tick(3000);

    store.toggleEngagement('Own');
    store.toggleCostCenter('CITY PARCEL HUB');
    store.toggleCostCenter('CENTRAL FLEET EAST');
    const engagementFirst = store.rows();

    store.selectAllCostCenters();
    store.clearEngagements();
    store.toggleCostCenter('CENTRAL FLEET EAST');
    store.toggleCostCenter('CITY PARCEL HUB');
    store.toggleEngagement('Own');
    const centersFirst = store.rows();

    expect(centersFirst).toEqual(engagementFirst);
    // CPH Own 84916 + CNG Own 293296
    expect(centersFirst.find((r) => r.key === 'revenue')!.target).toBe(378212);
    expect(requests).toEqual(['2026-09']);
  }));

  it('persists month, cost centers and engagement filters', fakeAsync(() => {
    const store = TestBed.inject(DashboardStore);
    store.selectMonth('2026-09');
    store.toggleCostCenter('CITY PARCEL HUB');
    store.toggleEngagement('Rented');
    TestBed.flushEffects();

    expect(TestBed.inject(DashboardFiltersStorage).load()).toEqual({
      month: '2026-09',
      costCenters: ['CITY PARCEL HUB'],
      engagements: ['Rented'],
    });
    tick(3000);
    discardPeriodicTasks();
  }));
});
