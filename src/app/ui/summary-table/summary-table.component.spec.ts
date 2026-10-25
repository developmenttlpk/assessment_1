import { ComponentFixture, TestBed } from '@angular/core/testing';
import { aggregateTotals, buildSummaryRows } from '../../core/aggregation';
import { SEPTEMBER } from '../../../testing/fixtures';
import { SummaryRow } from '../../models/dashboard.models';
import { SummaryTableComponent } from './summary-table.component';

describe('SummaryTableComponent', () => {
  let fixture: ComponentFixture<SummaryTableComponent>;

  function render(rows: SummaryRow[]): HTMLElement {
    fixture.componentRef.setInput('rows', rows);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SummaryTableComponent] });
    fixture = TestBed.createComponent(SummaryTableComponent);
  });

  it('renders the columns, 10 metric rows and N/A for GP % Variance %', () => {
    const el = render(buildSummaryRows(aggregateTotals(SEPTEMBER.data.details, [])));
    const headers = Array.from(el.querySelectorAll('thead th')).map((th) => th.textContent?.trim());
    expect(headers).toEqual(['Metric', 'Target', 'Actual', 'Variance', 'Variance %']);
    expect(el.querySelectorAll('tbody tr').length).toBe(10);

    const gpPctCells = el.querySelectorAll('tr[data-metric="gp_percentage"] td');
    expect(gpPctCells[3].textContent?.trim()).toBe('N/A');
  });

  it('colours variances by status and formats to two decimals', () => {
    const rows: SummaryRow[] = [
      { key: 'a', label: 'Good', format: 'money', target: 1, actual: 2, variance: 1, variancePercentage: 100, status: 'favorable' },
      { key: 'b', label: 'Bad', format: 'money', target: 2, actual: 1, variance: -1, variancePercentage: -50, status: 'unfavorable' },
      { key: 'c', label: 'Flat', format: 'money', target: 1, actual: 1, variance: 0, variancePercentage: 0, status: 'neutral' },
    ];
    const el = render(rows);
    const variance = (key: string) => el.querySelector(`tr[data-metric="${key}"] td:nth-of-type(3)`)!;
    expect(variance('a').classList).toContain('status-favorable');
    expect(variance('b').classList).toContain('status-unfavorable');
    expect(variance('c').classList).toContain('status-neutral');
    expect(variance('b').textContent?.trim()).toBe('-1.00');
  });
});
