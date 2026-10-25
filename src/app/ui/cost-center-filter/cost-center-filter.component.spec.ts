import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { buildCostCenterOptions } from '../../core/cost-centers';
import { SEPTEMBER } from '../../../testing/fixtures';
import { CostCenterFilterComponent } from './cost-center-filter.component';

describe('CostCenterFilterComponent', () => {
  let fixture: ComponentFixture<CostCenterFilterComponent>;
  let toggled: string[];
  let allClicks: number;

  async function checkbox(label: string): Promise<MatCheckboxHarness> {
    return TestbedHarnessEnvironment.loader(fixture).getHarness(MatCheckboxHarness.with({ label: new RegExp(`^${label}`) }));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CostCenterFilterComponent], providers: [provideNoopAnimations()] });
    fixture = TestBed.createComponent(CostCenterFilterComponent);
    fixture.componentRef.setInput('options', buildCostCenterOptions(SEPTEMBER.data.details));
    fixture.componentRef.setInput('selected', []);
    toggled = [];
    allClicks = 0;
    fixture.componentInstance.toggled.subscribe((name) => toggled.push(name));
    fixture.componentInstance.allSelected.subscribe(() => allClicks++);
  });

  it('emits the clicked center and keeps All checked when All is clicked again', async () => {
    await (await checkbox('CITY PARCEL HUB')).check();
    expect(toggled).toEqual(['CITY PARCEL HUB']);

    const all = await checkbox('All');
    await all.toggle();
    expect(allClicks).toBe(1);
    expect(await all.isChecked()).toBeTrue();
  });

  it('filters options by search text', async () => {
    const loader = TestbedHarnessEnvironment.loader(fixture);
    await (await loader.getHarness(MatInputHarness)).setValue('fleet');
    const labels = await Promise.all((await loader.getAllHarnesses(MatCheckboxHarness)).map((c) => c.getLabelText()));
    expect(labels.length).toBe(3); // All + two merged members
    expect(labels.slice(1).every((l) => l.includes('CENTRAL FLEET'))).toBeTrue();
  });
});
