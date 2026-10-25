import { Injectable } from '@angular/core';
import { DashboardFilters } from '../models/dashboard.models';
import { sanitizeFilters } from '../core/filters';

export const FILTERS_STORAGE_KEY = 'mtd-dashboard.filters.v1';

// Persists filters in localStorage; tolerates unavailable storage and malformed values.
@Injectable({ providedIn: 'root' })
export class DashboardFiltersStorage {
  load(): DashboardFilters {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      return sanitizeFilters(raw ? JSON.parse(raw) : null);
    } catch {
      return sanitizeFilters(null);
    }
  }

  save(filters: DashboardFilters): void {
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // Storage full or disabled: filters still work for this session.
    }
  }
}
