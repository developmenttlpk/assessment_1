import { CostCenterOption } from '../models/dashboard.models';
import { CostCenterDetail } from '../models/performance-api.models';

// Stable identity of a response row. Rows that belong to a merge group are keyed by the
// group id so every member name resolves to the same row.

export function detailKey(detail: CostCenterDetail): string {
  return detail.merge_group_id != null ? `group:${detail.merge_group_id}` : `center:${detail.cost_center}`;
}

// Distinct selectable names: each cost_center label, plus merged member names that resolve to their
// group row.

export function buildCostCenterOptions(details: readonly CostCenterDetail[]): CostCenterOption[] {
  const options: CostCenterOption[] = [];
  const seen = new Set<string>();

  for (const detail of details) {
    const key = detailKey(detail);
    if (!seen.has(detail.cost_center)) {
      seen.add(detail.cost_center);
      options.push({ name: detail.cost_center, detailKey: key });
    }
    for (const member of detail.merged_group_costcenters ?? []) {
      if (!seen.has(member)) {
        seen.add(member);
        options.push({ name: member, detailKey: key, mergedInto: detail.cost_center });
      }
    }
  }
  return options;
}

// Resolves selected names to response rows. Each row is returned at most once, so a merged
// row contributes once no matter how many of its member names are selected.
// An empty selection means "All".

export function resolveSelectedDetails(
  details: readonly CostCenterDetail[],
  selectedNames: readonly string[],
): CostCenterDetail[] {
  if (selectedNames.length === 0) {
    return uniqueDetails(details);
  }
  const nameToKey = new Map(buildCostCenterOptions(details).map((o) => [o.name, o.detailKey]));
  const wantedKeys = new Set(
    selectedNames.map((name) => nameToKey.get(name)).filter((key): key is string => key !== undefined),
  );
  return uniqueDetails(details).filter((detail) => wantedKeys.has(detailKey(detail)));
}

function uniqueDetails(details: readonly CostCenterDetail[]): CostCenterDetail[] {
  const seen = new Set<string>();
  return details.filter((detail) => {
    const key = detailKey(detail);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
