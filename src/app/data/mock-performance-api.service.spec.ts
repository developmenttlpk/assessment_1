import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FIXTURES, SEPTEMBER } from '../../testing/fixtures';
import { PerformanceResponse } from '../models/performance-api.models';
import {
  DEFAULT_MOCK_API_CONFIG,
  MAX_DELAY_MS,
  MIN_DELAY_MS,
  MOCK_API_CONFIG,
  MockApiError,
  MockPerformanceApiService,
} from './mock-performance-api.service';

describe('MockPerformanceApiService', () => {
  let fail = false;

  beforeEach(() => {
    fail = false;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MOCK_API_CONFIG,
          useValue: {
            delayMs: () => 500,
            shouldFail: () => fail,
            loadFixture: (month: keyof typeof FIXTURES) => Promise.resolve(FIXTURES[month]),
          },
        },
      ],
    });
  });

  it('emits a deep copy of the month fixture after the simulated latency', fakeAsync(() => {
    let result: PerformanceResponse | undefined;
    TestBed.inject(MockPerformanceApiService)
      .getPerformance('2026-09')
      .subscribe((r) => (result = r));

    tick(499);
    expect(result).toBeUndefined();
    tick(1);
    expect(result).toEqual(SEPTEMBER);
    expect(result).not.toBe(SEPTEMBER);
  }));

  it('errors when the request is set to fail', fakeAsync(() => {
    fail = true;
    let error: unknown;
    TestBed.inject(MockPerformanceApiService)
      .getPerformance('2026-10')
      .subscribe({ error: (e) => (error = e) });
    tick(500);
    expect(error).toEqual(jasmine.any(MockApiError));
  }));

  it('default latency stays within 300–3000 ms', () => {
    for (let i = 0; i < 500; i++) {
      const delay = DEFAULT_MOCK_API_CONFIG.delayMs('2026-09');
      expect(delay).toBeGreaterThanOrEqual(MIN_DELAY_MS);
      expect(delay).toBeLessThanOrEqual(MAX_DELAY_MS);
    }
  });
});
