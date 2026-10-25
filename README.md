
# Logistics MTD Performance Dashboard

An Angular 18 + Angular Material 18 dashboard that compares month-to-date targets with actuals across cost centers and vehicle engagement types. The dashboard uses a mock API backed by the two provided JSON fixtures.

(Desktop dashboard)(docs/screenshots/dashboard-desktop.png)

Narrow / mobile layout | Error state (simulated 10% failure) |
(Narrow layout)(docs/screenshots/dashboard-narrow.png) |(Error state)(docs/screenshots/error-state-narrow.png) 

## Run and Test

Requires a compatible Node.js version and Chrome for browser tests.

"bash
npm install
npm start
npm test
npx ng test --watch=false --browsers=ChromeHeadless
npm run build
"

The application runs at "http://localhost:4200".

Every mock API request takes between 300 and 3,000 ms and has a 10% chance of failure. Use "Refresh" to request data again.

## Project Structure

Layer | Path | Responsibility |
Models | "src/app/models/" | Interfaces for API payloads, filters, dashboard state, and table rows |
Data access | "src/app/data/mock-performance-api.service.ts" | Mock API with latency, failure simulation, and fixture loading, configurable through "MOCK_API_CONFIG" |
Calculation | "src/app/core/aggregation.ts", "cost-centers.ts", "filters.ts" | Pure functions for aggregation, GP adjustment, variance and status calculations, merged-center resolution, and filter transitions |
State | "src/app/state/dashboard.store.ts" | Request lifecycle, per-month caching, stale-response protection, filter signals, and "localStorage" persistence |
UI | "src/app/pages/dashboard/", "src/app/ui/" | Standalone Angular components using Angular Material |
Fixtures | "src/app/data/fixtures/" | The provided September and October 2026 JSON fixtures |

The UI uses Angular Material components, including "mat-table", "mat-select", "mat-card", "mat-progress-bar", "mat-checkbox", and "mat-button-toggle-group".

Routing lazy-loads the dashboard at "/", and unknown paths redirect to the dashboard. Each month fixture is loaded on its first request.

## How Aggregation Works

### 1. Cost-center selection

An empty cost-center selection means "All".

Each response row has a stable key:

"group:<merge_group_id>" for merged rows.
"center:<cost_center>" for individual rows.

Member names in "merged_group_costcenters" are available as selectable options and map to their merged group's key. Selected names are resolved to unique keys so that a merged response row is counted only once, even if multiple members are selected.

### 2. Engagement selection

With no engagement filter, the application uses each row's combined "tables".

When one or more of Own, Rented, or Hired are selected, the application uses only the corresponding "engagement_tables" entries.

For example, "All cost centers + Own" sums Own across all centers. KPI calculations do not use "data.report" as their source.

### 3. Aggregate targets and actuals

The application sums "total.target" and "total.actual" first. Source-provided "variance", "variance_pct", "variance_percentage", "status", and "gp_percentage" fields are not used to calculate the displayed results.

### 4. Calculate the displayed values

The application derives the display values from the aggregated target and actual values.

"Adjusted GP:" "rawGP revenue * 1.15 * 0.07", calculated separately for target and actual.
"GP%:" "adjustedGP / revenue * 100". If revenue is zero, GP% is zero.
"Revenue, GP, KMs, and trips:" "variance = actual target".
"Costs:" "variance = target actual".
"Variance percentage:" "variance / target * 100".
"Zero target:" If the target is zero, variance percentage is displayed as "0.00%", while the absolute variance is retained.
"GP% variance:" Displayed in percentage points. Variance percentage is shown as "N/A".

A positive variance is favorable, a negative variance is unfavorable, and an exact zero is neutral. Favorable values are displayed in green, unfavorable values in red, and neutral values without a positive or negative status color.

The displayed values are computed from the response and current filters. Changing filters does not trigger another request, and the response objects are not mutated.

A deep-freeze test checks that aggregation does not modify the input data.

### Report cross-check

For "All cost centers + combined engagement", the computed results are cross-checked against "data.report" for both months, including GP%.

The October GP% values are documented in the tests as 40.82% and 42.81%. This cross-check helps validate the GP adjustment formula against the source data.

## Request Handling and Caching

### Cancellation and stale responses

Requests are processed through a "Subject<LoadRequest>" and "switchMap". Changing the month or pressing Refresh unsubscribes from the previous in-flight request.

A month check also prevents events associated with a previously selected month from changing the current month's data, loading state, or error state.

### Cache behavior

Successful responses are stored in a "Map<MonthKey, PerformanceResponse>".

Switching to a cached month reuses its response.
Refresh bypasses the cache and requests fresh data.
Existing cached data remains visible while refreshing.
If a refresh fails, the error is shown while the last valid data remains available.
A failed refresh does not replace the successful cached response.

### Teardown

The request pipeline uses "takeUntilDestroyed". Request delays use RxJS "timer" observables, and the components use Angular template bindings rather than manually registered event listeners.

### Testability

"MOCK_API_CONFIG" provides configurable functions:

"delayMs(month)"
"shouldFail(month)"
"loadFixture(month)"

These allow tests to control latency, failures, and fixture loading. The store tests use different September and October delays to test overlapping requests.

### Filter persistence

Month, cost-center, and engagement filters are persisted in "localStorage" under:

"mtd-dashboard.filters.v1"

Stored values are validated before use. The application falls back to default filters if stored values are invalid or browser storage is unavailable.

## Tests

| Area | Coverage |
| --| --|
| Aggregation | Multi-center aggregation, report cross-check, ignoring source variance fields |
| Edge cases | Zero-target variance percentage, neutral zero, zero-revenue GP% |
| GP calculations | Adjusted GP and derived GP%; GP% is not summed or averaged |
| Engagement filters | Combined selections, All + Own, and response immutability |
| Merged centers | Merged-center resolution and deduplication |
| Filter logic | All and individual selections, engagement ordering, persisted-state sanitization |
| Mock API | Latency bounds, copied responses, and simulated failures |
| Dashboard store | Stale responses, caching, refresh, failed refresh, filter changes, and persistence |
| Summary table | Columns, N/A values, status colors, and two-decimal formatting |
| Filter components | Material test harnesses, All selection, search, and toggles |

Run the complete test suite with:

"bash
npx ng test --watch=false --browsers=ChromeHeadless
"

## Assumptions

The cost-center list includes distinct "cost_center" labels and member names from merged groups, labelled to indicate which group they belong to.
KMs are displayed with two decimal places.
Trips are integer counts and are displayed without decimal places.
The fixture data does not specify a currency, so monetary values are displayed as plain numbers with two decimal places.
The provided JSON fixtures are treated as input data and are not intentionally modified by the application.
