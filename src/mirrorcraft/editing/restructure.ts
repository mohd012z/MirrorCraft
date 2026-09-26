import type {
  SiteDNA,
  SiteDNAComponent,
} from "@/mirrorcraft/site-dna/schema";

export type RestructureAction =
  | "move"
  | "wrap"
  | "unwrap"
  | "reorder"
  | "group"
  | "flatten";

export interface RestructurePlan {
  id: string;
  action: RestructureAction;
  before: SiteDNA;
  after: SiteDNA;
  affectedComponentIds: readonly string[];
  reversible: true;
}

function cloneSite(site: SiteDNA): SiteDNA {
  return structuredClone(site);
}

function requireComponent(site: SiteDNA, componentId: string): SiteDNAComponent {
  const component = site.components[componentId];
  if (!component) throw new Error(`Unknown SiteDNA component: ${componentId}`);
  return component;
}

function plan(
  action: RestructureAction,
  before: SiteDNA,
  after: SiteDNA,
  affectedComponentIds: readonly string[],
): RestructurePlan {
  return {
    id: `restructure:${action}:${affectedComponentIds.join(",")}`,
    action,
    before: cloneSite(before),
    after: cloneSite(after),
    affectedComponentIds: [...new Set(affectedComponentIds)],
    reversible: true,
  };
}

function descendantsContain(
  site: SiteDNA,
  componentId: string,
  candidateId: string,
): boolean {
  const queue = [...requireComponent(site, componentId).children];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    if (current === candidateId) return true;
    visited.add(current);
    const component = site.components[current];
    if (component) queue.push(...component.children);
  }
  return false;
}

function removeFromParent(site: SiteDNA, component: SiteDNAComponent): void {
  if (!component.parentId) return;
  const parent = requireComponent(site, component.parentId);
  parent.children = parent.children.filter((id) => id !== component.id);
}

function boundedIndex(index: number, length: number): number {
  return Math.max(0, Math.min(Math.floor(index), length));
}

export function moveComponent(
  site: SiteDNA,
  componentId: string,
  newParentId: string,
  index = Number.MAX_SAFE_INTEGER,
): RestructurePlan {
  const before = cloneSite(site);
  const after = cloneSite(site);
  const component = requireComponent(after, componentId);
  const newParent = requireComponent(after, newParentId);

  if (componentId === newParentId || descendantsContain(after, componentId, newParentId)) {
    throw new Error("Cannot move a component into itself or its descendant");
  }

  const oldParentId = component.parentId;
  removeFromParent(after, component);
  const targetIndex = boundedIndex(index, newParent.children.length);
  newParent.children.splice(targetIndex, 0, componentId);
  component.parentId = newParentId;

  return plan(
    "move",
    before,
    after,
    [componentId, newParentId, ...(oldParentId ? [oldParentId] : [])],
  );
}

function selectedChildOrder(
  parent: SiteDNAComponent,
  componentIds: readonly string[],
): { ordered: string[]; start: number } {
  const selected = new Set(componentIds);
  if (selected.size !== componentIds.length || selected.size === 0) {
    throw new Error("Wrap/group requires unique component ids");
  }

  const ordered = parent.children.filter((id) => selected.has(id));
  if (ordered.length !== selected.size) {
    throw new Error("Every wrapped component must be a child of the same parent");
  }

  const indices = ordered.map((id) => parent.children.indexOf(id));
  const start = Math.min(...indices);
  const contiguous = indices.every((value, offset) => value === start + offset);
  if (!contiguous) {
    throw new Error("Wrapped components must be contiguous to preserve sibling order");
  }

  return { ordered, start };
}

export function wrapComponents(
  site: SiteDNA,
  componentIds: readonly string[],
  wrapper: SiteDNAComponent,
): RestructurePlan {
  const before = cloneSite(site);
  const after = cloneSite(site);

  if (after.components[wrapper.id]) {
    throw new Error(`Wrapper component already exists: ${wrapper.id}`);
  }

  const components = componentIds.map((id) => requireComponent(after, id));
  if (components.length === 0) throw new Error("Wrap requires at least one component");
  const parentId = components[0].parentId;
  if (!parentId || components.some((component) => component.parentId !== parentId)) {
    throw new Error("Wrapped components must share a concrete parent");
  }

  const parent = requireComponent(after, parentId);
  const selection = selectedChildOrder(parent, componentIds);
  const routeIds =
    wrapper.routeIds.length > 0
      ? [...wrapper.routeIds]
      : [
          ...new Set(
            selection.ordered.flatMap((id) => after.components[id].routeIds),
          ),
        ];

  after.components[wrapper.id] = {
    ...structuredClone(wrapper),
    routeIds,
    parentId,
    children: [...selection.ordered],
  };

  parent.children.splice(
    selection.start,
    selection.ordered.length,
    wrapper.id,
  );
  for (const id of selection.ordered) {
    after.components[id].parentId = wrapper.id;
  }

  return plan(
    "wrap",
    before,
    after,
    [parentId, wrapper.id, ...selection.ordered],
  );
}

export function unwrapComponent(
  site: SiteDNA,
  wrapperId: string,
): RestructurePlan {
  const before = cloneSite(site);
  const after = cloneSite(site);
  const wrapper = requireComponent(after, wrapperId);
  if (!wrapper.parentId) throw new Error("Cannot unwrap a root component without an ordered root container");

  const parent = requireComponent(after, wrapper.parentId);
  const wrapperIndex = parent.children.indexOf(wrapperId);
  if (wrapperIndex < 0) throw new Error("Wrapper is not linked from its parent");

  const children = [...wrapper.children];
  for (const childId of children) {
    const child = requireComponent(after, childId);
    if (child.parentId !== wrapperId) {
      throw new Error(`Child ${childId} is not parented by wrapper ${wrapperId}`);
    }
    child.parentId = parent.id;
  }

  parent.children.splice(wrapperIndex, 1, ...children);
  delete after.components[wrapperId];
  delete after.responsive[wrapperId];
  delete after.fingerprints[wrapperId];

  return plan(
    "unwrap",
    before,
    after,
    [parent.id, wrapperId, ...children],
  );
}

export function reorderChildren(
  site: SiteDNA,
  parentId: string,
  orderedChildIds: readonly string[],
): RestructurePlan {
  const before = cloneSite(site);
  const after = cloneSite(site);
  const parent = requireComponent(after, parentId);
  const current = parent.children;
  const requested = [...orderedChildIds];

  if (
    current.length !== requested.length ||
    new Set(current).size !== new Set(requested).size ||
    current.some((id) => !requested.includes(id))
  ) {
    throw new Error("Reorder must contain exactly the parent's existing children");
  }

  parent.children = requested;
  return plan("reorder", before, after, [parentId, ...requested]);
}

export function groupComponents(
  site: SiteDNA,
  componentIds: readonly string[],
  group: SiteDNAComponent,
): RestructurePlan {
  const wrapped = wrapComponents(site, componentIds, group);
  return { ...wrapped, id: wrapped.id.replace("restructure:wrap:", "restructure:group:"), action: "group" };
}

export function flattenComponent(
  site: SiteDNA,
  componentId: string,
): RestructurePlan {
  const unwrapped = unwrapComponent(site, componentId);
  return {
    ...unwrapped,
    id: unwrapped.id.replace("restructure:unwrap:", "restructure:flatten:"),
    action: "flatten",
  };
}

export function rollbackRestructure(planValue: RestructurePlan): SiteDNA {
  return cloneSite(planValue.before);
}
