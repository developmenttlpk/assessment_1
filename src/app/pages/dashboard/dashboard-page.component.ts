import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MONTHS, isMonthKey } from '../../core/filters';
import { DashboardStore } from '../../state/dashboard.store';
import { CostCenterFilterComponent } from '../../ui/cost-center-filter/cost-center-filter.component';
import { EngagementFilterComponent } from '../../ui/engagement-filter/engagement-filter.component';
import { SummaryTableComponent } from '../../ui/summary-table/summary-table.component';

// Container: wires store state to presentational children
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatToolbarModule,
    SummaryTableComponent,
    CostCenterFilterComponent,
    EngagementFilterComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent implements OnInit {
  readonly store = inject(DashboardStore);
  readonly months = MONTHS;

  readonly report = computed(() => this.store.state().response?.data.report ?? null);

  readonly selectionLabel = computed(() => {
    const { costCenters, engagements } = this.store.filters();
    const centers = costCenters.length === 0 ? 'All cost centers' : costCenters.join(', ');
    const types = engagements.length === 0 ? 'combined' : engagements.join(' + ');
    return `${centers} · ${types}`;
  });

  ngOnInit(): void {
    this.store.init();
  }

  onMonthChange(event: MatSelectChange): void {
    if (isMonthKey(event.value)) {
      this.store.selectMonth(event.value);
    }
  }
}
