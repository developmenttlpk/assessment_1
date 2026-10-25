import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { ENGAGEMENT_TYPES, EngagementType } from '../../models/performance-api.models';

// Independent Own / Rented / Hired toggles. None selected means combined tables.
@Component({
  selector: 'app-engagement-filter',
  standalone: true,
  imports: [MatButtonModule, MatButtonToggleModule, MatCardModule],
  template: `
    <mat-card appearance="outlined" class="filter">
      <mat-card-header>
        <mat-card-title>Engagement type</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <mat-button-toggle-group
          multiple
          hideMultipleSelectionIndicator
          aria-label="Engagement type"
          class="toggles"
          [value]="selected"
          (change)="onChange($event)"
        >
          @for (type of types; track type) {
            <mat-button-toggle [value]="type">{{ type }}</mat-button-toggle>
          }
        </mat-button-toggle-group>
        <p class="note">
          @if (selected.length === 0) {
            Showing combined data (no engagement filter).
          } @else {
            Showing {{ selected.join(' + ') }} only.
          }
        </p>
        @if (selected.length > 0) {
          <button mat-button type="button" (click)="cleared.emit()">Clear</button>
        }
      </mat-card-content>
    </mat-card>
  `,
  styleUrl: '../filter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EngagementFilterComponent {
  readonly types = ENGAGEMENT_TYPES;

  @Input({ required: true }) selected: readonly EngagementType[] = [];
  @Output() readonly toggled = new EventEmitter<EngagementType>();
  @Output() readonly cleared = new EventEmitter<void>();

  /** Emits the single toggle that was clicked; the store owns the resulting selection. */
  onChange(event: MatButtonToggleChange): void {
    this.toggled.emit(event.source.value as EngagementType);
  }
}
