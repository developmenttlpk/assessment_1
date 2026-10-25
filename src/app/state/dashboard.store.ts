import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, concat, map, of, switchMap } from 'rxjs';
import { aggregateTotals, buildSummaryRows } from '../core/aggregation';
import { buildCostCenterOptions, resolveSelectedDetails } from '../core/cost-centers';
import { toggleCostCenter, toggleEngagement } from '../core/filters';
import { MockPerformanceApiService } from '../data/mock-performance-api.service';
import { DashboardFilters, DashboardState, SummaryRow } from '../models/dashboard.models';
import { EngagementType, MonthKey, PerformanceResponse } from '../models/performance-api.models';
import { DashboardFiltersStorage } from './dashboard-filters.storage';

interface LoadRequest {
  month: MonthKey;
  bypassCache: boolean;
}

type LoadEvent =
  | { kind: 'loading'; month: MonthKey }
  | { kind: 'success'; month: MonthKey; response: PerformanceResponse }
  | { kind: 'error'; month: MonthKey; message: string };

//  Owns request lifecycle, per-month cache, and filter state. Derived KPI rows are computed
//  signals, so filter changes never trigger API calls.

@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly api = inject(MockPerformanceApiService);
  private readonly storage = inject(DashboardFiltersStorage);

  private readonly cache = new Map<MonthKey, PerformanceResponse>();
  private readonly loadRequests = new Subject<LoadRequest>();
  private started = false;

  private readonly filtersSignal = signal<DashboardFilters>(this.storage.load());
  private readonly stateSignal = signal<DashboardState>({
    month: this.filtersSignal().month,
    response: null,
    loading: false,
    error: null,
  });

  readonly filters = this.filtersSignal.asReadonly();
  readonly state = this.stateSignal.asReadonly();

  readonly costCenterOptions = computed(() => buildCostCenterOptions(this.stateSignal().response?.data.details ?? []));

  readonly selectedDetails = computed(() => {
    const response = this.stateSignal().response;
    return response ? resolveSelectedDetails(response.data.details, this.filtersSignal().costCenters) : [];
  });

  readonly rows = computed<SummaryRow[]>(() => {
    const details = this.selectedDetails();
    return details.length === 0 ? [] : buildSummaryRows(aggregateTotals(details, this.filtersSignal().engagements));
  });

  constructor() {
    // switchMap unsubscribes from the previous in-flight request when a new one starts, so a
    // slow September response can never land after October was requested. The month check in
    // `apply` is a second guard against anything that is not for the currently selected month.
    this.loadRequests
      .pipe(
        switchMap((request) => this.toLoadEvents(request)),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((event) => this.apply(event));

    effect(() => this.storage.save(this.filtersSignal()));
  }

  // Loads the persisted month. Safe to call more than once.
  init(): void {
    if (!this.started) {
      this.started = true;
      this.request(this.filtersSignal().month, false);
    }
  }

  selectMonth(month: MonthKey): void {
    this.filtersSignal.update((f) => ({ ...f, month }));
    this.request(month, false);
  }

  // Bypasses the cache. On failure the last valid data for the month is kept.
  refresh(): void {
    this.request(this.filtersSignal().month, true);
  }

  selectAllCostCenters(): void {
    this.filtersSignal.update((f) => ({ ...f, costCenters: [] }));
  }

  toggleCostCenter(name: string): void {
    this.filtersSignal.update((f) => ({ ...f, costCenters: toggleCostCenter(f.costCenters, name) }));
  }

  toggleEngagement(type: EngagementType): void {
    this.filtersSignal.update((f) => ({ ...f, engagements: toggleEngagement(f.engagements, type) }));
  }

  clearEngagements(): void {
    this.filtersSignal.update((f) => ({ ...f, engagements: [] }));
  }

  private request(month: MonthKey, bypassCache: boolean): void {
    this.started = true;
    this.loadRequests.next({ month, bypassCache });
  }

  private toLoadEvents({ month, bypassCache }: LoadRequest): Observable<LoadEvent> {
    const cached = this.cache.get(month);
    if (cached && !bypassCache) {
      return of({ kind: 'success', month, response: cached });
    }
    return concat(
      of<LoadEvent>({ kind: 'loading', month }),
      this.api.getPerformance(month).pipe(
        map((response): LoadEvent => ({ kind: 'success', month, response })),
        catchError((err: unknown) =>
          of<LoadEvent>({
            kind: 'error',
            month,
            message: err instanceof Error ? err.message : 'Unexpected error while loading data.',
          }),
        ),
      ),
    );
  }

  private apply(event: LoadEvent): void {
    if (event.month !== this.filtersSignal().month) {
      return;
    }
    switch (event.kind) {
      case 'loading':
        this.stateSignal.set({
          month: event.month,
          response: this.cache.get(event.month) ?? null,
          loading: true,
          error: null,
        });
        break;
      case 'success':
        this.cache.set(event.month, event.response);
        this.stateSignal.set({ month: event.month, response: event.response, loading: false, error: null });
        break;
      case 'error':
        this.stateSignal.set({
          month: event.month,
          response: this.cache.get(event.month) ?? null,
          loading: false,
          error: event.message,
        });
        break;
    }
  }
}
