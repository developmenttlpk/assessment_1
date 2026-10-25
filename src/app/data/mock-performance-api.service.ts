import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, defer, from, map, switchMap, throwError, timer } from 'rxjs';
import { MonthKey, PerformanceResponse } from '../models/performance-api.models';

export interface MockApiConfig {
  // Latency in ms for a request to `month`. Called once per request.
  delayMs: (month: MonthKey) => number;
  // Whether a request to `month` fails. Called once per request.
  shouldFail: (month: MonthKey) => boolean;
  // Loads the untouched fixture for `month`.
  loadFixture: (month: MonthKey) => Promise<PerformanceResponse>;
}

export const MIN_DELAY_MS = 300;
export const MAX_DELAY_MS = 3000;
export const FAILURE_RATE = 0.1;

// The JSON fixtures are imported as-is (never edited) and code-split per month.
const FIXTURE_LOADERS: Record<MonthKey, () => Promise<PerformanceResponse>> = {
  '2026-09': () =>
    import('./fixtures/mock-performance-2026-09.json').then((m) => m.default as unknown as PerformanceResponse),
  '2026-10': () =>
    import('./fixtures/mock-performance-2026-10.json').then((m) => m.default as unknown as PerformanceResponse),
};

export const DEFAULT_MOCK_API_CONFIG: MockApiConfig = {
  delayMs: () => MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)),
  shouldFail: () => Math.random() < FAILURE_RATE,
  loadFixture: (month) => FIXTURE_LOADERS[month](),
};

/** Override in tests to control latency and failures deterministically. */
export const MOCK_API_CONFIG = new InjectionToken<MockApiConfig>('MOCK_API_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_MOCK_API_CONFIG,
});

export class MockApiError extends Error {
  constructor(readonly month: MonthKey) {
    super(`Could not load performance data for ${month}. Please try again.`);
    this.name = 'MockApiError';
  }
}

@Injectable({ providedIn: 'root' })
export class MockPerformanceApiService {
  private readonly config = inject(MOCK_API_CONFIG);

  //  Cold observable: latency and failure are decided per subscription. Each success emits a
  //  fresh deep copy, so consumers can never mutate the shared fixture.

  getPerformance(month: MonthKey): Observable<PerformanceResponse> {
    return defer(() => {
      const delay = this.config.delayMs(month);
      const fail = this.config.shouldFail(month);
      return timer(delay).pipe(
        switchMap(() =>
          fail
            ? throwError(() => new MockApiError(month))
            : from(this.config.loadFixture(month)).pipe(map((response) => structuredClone(response))),
        ),
      );
    });
  }
}
