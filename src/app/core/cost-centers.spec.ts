import { SEPTEMBER } from '../../testing/fixtures';
import { aggregateTotals } from './aggregation';
import { buildCostCenterOptions, detailKey, resolveSelectedDetails } from './cost-centers';

const details = SEPTEMBER.data.details;
const cng = details.find((d) => d.cost_center === 'CENTRAL NETWORK GROUP')!;

describe('cost center resolution', () => {
  it('lists distinct labels plus merged member names pointing at their group row', () => {
    const options = buildCostCenterOptions(details);
    const names = options.map((o) => o.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain('CITY PARCEL HUB');

    const east = options.find((o) => o.name === 'CENTRAL FLEET EAST')!;
    const west = options.find((o) => o.name === 'CENTRAL FLEET WEST')!;
    expect(east.mergedInto).toBe('CENTRAL NETWORK GROUP');
    expect(east.detailKey).toBe(detailKey(cng));
    expect(west.detailKey).toBe(detailKey(cng));
  });

  it('resolves member names to the merged row exactly once', () => {
    const resolved = resolveSelectedDetails(details, ['CENTRAL FLEET EAST', 'CENTRAL FLEET WEST', 'CENTRAL NETWORK GROUP']);
    expect(resolved).toEqual([cng]);
  });

  it('merged row contributes once to totals even when several members are selected', () => {
    const viaMembers = aggregateTotals(resolveSelectedDetails(details, ['CENTRAL FLEET EAST', 'CENTRAL FLEET WEST']), []);
    const direct = aggregateTotals([cng], []);
    expect(viaMembers).toEqual(direct);
    expect(viaMembers.revenue.target).toBe(978397);
  });

  it('combines a merged member with an unrelated center', () => {
    const resolved = resolveSelectedDetails(details, ['CENTRAL FLEET WEST', 'CITY PARCEL HUB']);
    expect(resolved.map((d) => d.cost_center)).toEqual(['CITY PARCEL HUB', 'CENTRAL NETWORK GROUP']);
  });

  it('returns every row for an empty (All) selection and ignores unknown names', () => {
    expect(resolveSelectedDetails(details, []).length).toBe(details.length);
    expect(resolveSelectedDetails(details, ['DOES NOT EXIST'])).toEqual([]);
  });
});
