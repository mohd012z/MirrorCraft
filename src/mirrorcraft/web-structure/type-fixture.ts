import type {
  WebEdge,
  WebEdgeKind,
  WebNode,
  WebNodeKind,
  WebStructureGraph,
} from "@/mirrorcraft/web-structure/types";
import {
  addWebEdge,
  addWebNode,
  createWebStructureGraph,
  getAncestors,
  getChildren,
  getCrossFunctionLinks,
  getDescendants,
  validateWebStructure,
} from "@/mirrorcraft/web-structure/graph";

const nodeKinds: WebNodeKind[] = [
  "base",
  "group",
  "subgroup",
  "page",
  "tab",
  "container",
  "child",
  "content",
  "database",
  "function",
];

const edgeKinds: WebEdgeKind[] = [
  "contains",
  "child-of",
  "subgroup-of",
  "page-of",
  "tab-of",
  "binds-content",
  "reads-data",
  "writes-data",
  "invokes",
  "cross-function",
  "navigates-to",
  "inherits-from",
];

const root: WebNode = { id: "base", kind: "base", label: "Site" };
const page: WebNode = { id: "page:home", kind: "page", label: "Home", route: "/" };
const tab: WebNode = { id: "tab:overview", kind: "tab", label: "Overview" };
const panel: WebNode = { id: "container:hero", kind: "container", label: "Hero" };
const content: WebNode = { id: "content:title", kind: "content", label: "Title" };
const loader: WebNode = { id: "fn:load", kind: "function", label: "loadContent" };
const db: WebNode = { id: "db:content", kind: "database", label: "Content DB" };

let graph: WebStructureGraph = createWebStructureGraph("fixture");
for (const node of [root, page, tab, panel, content, loader, db]) {
  graph = addWebNode(graph, node);
}

const edges: WebEdge[] = [
  { from: root.id, to: page.id, kind: "contains" },
  { from: page.id, to: tab.id, kind: "contains" },
  { from: tab.id, to: panel.id, kind: "contains" },
  { from: panel.id, to: content.id, kind: "binds-content" },
  { from: loader.id, to: db.id, kind: "reads-data" },
  { from: panel.id, to: loader.id, kind: "cross-function" },
];

for (const edge of edges) graph = addWebEdge(graph, edge);

const children: WebNode[] = getChildren(graph, page.id);
const descendants: WebNode[] = getDescendants(graph, root.id);
const ancestors: WebNode[] = getAncestors(graph, panel.id);
const crossLinks: WebEdge[] = getCrossFunctionLinks(graph, panel.id);
const problems: string[] = validateWebStructure(graph);

void nodeKinds;
void edgeKinds;
void children;
void descendants;
void ancestors;
void crossLinks;
void problems;
