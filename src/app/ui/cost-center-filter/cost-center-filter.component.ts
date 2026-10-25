import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CostCenterOption } from '../../models/dashboard.models';

// Searchable multi-select with an "All" option. Emits intents; selection state lives in the store.
@Component({
  selector: 'app-cost-center-filter',
  standalone: true,
  imports: [MatCardModule, MatCheckboxModule, MatFormFieldModule, MatInputModule],
  templateUrl: './cost-center-filter.component.html',
  styleUrl: '../filter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostCenterFilterComponent {
  private readonly optionsSignal = signal<readonly CostCenterOption[]>([]);
  readonly query = signal('');

  @Input({ required: true }) set options(value: readonly CostCenterOption[]) {
    this.optionsSignal.set(value);
  }
  @Input({ required: true }) selected: readonly string[] = [];

  @Output() readonly allSelected = new EventEmitter<void>();
  @Output() readonly toggled = new EventEmitter<string>();

  readonly filteredOptions = computed(() => {
    const q = this.query().trim().toLowerCase();
    return q ? this.optionsSignal().filter((o) => o.name.toLowerCase().includes(q)) : this.optionsSignal();
  });

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  /** "All" cannot be unchecked directly; it is cleared by picking an individual center. */
  onAll(event: MatCheckboxChange): void {
    event.source.checked = true;
    this.allSelected.emit();
  }

  isSelected(name: string): boolean {
    return this.selected.includes(name);
  }
}
