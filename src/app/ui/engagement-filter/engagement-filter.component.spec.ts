import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonToggleHarness } from '@angular/material/button-toggle/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { EngagementType } from '../../models/performance-api.models';
import { EngagementFilterComponent } from './engagement-filter.component';

describe('EngagementFilterComponent', () => {
  it('emits each clicked type and reflects the selected input', async () => {
    TestBed.configureTestingModule({ imports: [EngagementFilterComponent], providers: [provideNoopAnimations()] });
    const fixture = TestBed.createComponent(EngagementFilterComponent);
    fixture.componentRef.setInput('selected', ['Hired']);
    const emitted: EngagementType[] = [];
    fixture.componentInstance.toggled.subscribe((t) => emitted.push(t));

    const loader = TestbedHarnessEnvironment.loader(fixture);
    const hired = await loader.getHarness(MatButtonToggleHarness.with({ text: 'Hired' }));
    expect(await hired.isChecked()).toBeTrue();

    await (await loader.getHarness(MatButtonToggleHarness.with({ text: 'Own' }))).toggle();
    expect(emitted).toEqual(['Own']);
  });
});
