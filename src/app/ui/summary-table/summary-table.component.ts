import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { SummaryRow, ValueFormat } from '../../models/dashboard.models';

// Presentational, reusable target-vs-actual table. All values arrive pre-computed. 
@Component({
  selector: 'app-summary-table',
  standalone: true,
  imports: [DecimalPipe, MatTableModule],
  templateUrl: './summary-table.component.html',
  styleUrl: './summary-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryTableComponent {
  @Input({ required: true }) rows: readonly SummaryRow[] = [];
  @Input() caption = 'Month-to-date performance';

  readonly columns = ['metric', 'target', 'actual', 'variance', 'variancePercentage'];

  digitsFor(format: ValueFormat): string {
    return format === 'count' ? '1.0-0' : '1.2-2';
  }

  suffixFor(format: ValueFormat): string {
    return format === 'percent' ? '%' : '';
  }

  // GP % variance is a percentage-point difference. 
  varianceSuffixFor(format: ValueFormat): string {
    return format === 'percent' ? ' pp' : '';
  }

  trackByKey = (_: number, row: SummaryRow): string => row.key;
}
