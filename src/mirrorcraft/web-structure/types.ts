export type WebNodeKind =
  | "base"
  | "group"
  | "subgroup"
  | "page"
  | "tab"
  | "container"
  | "child"
  | "content"
  | "database"
  | "function"
  | "api"
  | "route"
  | "asset";

export type WebEdgeKind =
  | "contains"
  | "child-of"
  | "subgroup-of"
  | "page-of"
  | "tab-of"
  | "binds-content"
  | "reads-data"
  | "writes-data"
  | "invokes"
  | "cross-function"
  | "navigates-to"
  | "inherits-from"
  | "uses-asset"
  | "calls-api";

export interface WebNode {
  id: string;
  kind: WebNodeKind;
  label: string;
  route?: string;
  sourcePath?: string;
  sourceLine?: number;
  metadata?: Record<string, unknown>;
}

export interface WebEdge {
  from: string;
  to: string;
  kind: WebEdgeKind;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface WebStructureGraph {
  projectId: string;
  nodes: Record<string, WebNode>;
  edges: WebEdge[];
}

export interface WebStructureMap {
  roots: WebNode[];
  hierarchyEdges: WebEdge[];
  relationshipEdges: WebEdge[];
}

export interface Web360Snapshot {
  focus: WebNode;
  parents: WebNode[];
  children: WebNode[];
  ancestors: WebNode[];
  descendants: WebNode[];
  incoming: WebEdge[];
  outgoing: WebEdge[];
  crossFunction: WebEdge[];
}
