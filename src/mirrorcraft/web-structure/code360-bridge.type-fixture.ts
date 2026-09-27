import type { Code360Graph } from "@/mirrorcraft/code360";
import type { WebStructureGraph } from "@/mirrorcraft/web-structure/types";
import {
  mapWebEdgeToCode360EdgeType,
  mapWebNodeToCode360NodeType,
  mergeWebStructureIntoCode360,
} from "@/mirrorcraft/web-structure/code360-bridge";

const web: WebStructureGraph = {
  projectId: "fixture",
  nodes: {
    page: { id: "page", kind: "page", label: "Home", route: "/" },
    button: { id: "button", kind: "child", label: "CTA" },
    fn: { id: "fn", kind: "function", label: "handleClick", sourcePath: "src/app/page.tsx" },
    api: { id: "api", kind: "api", label: "GET /api/data" },
    db: { id: "db", kind: "database", label: "projects" },
  },
  edges: [
    { from: "page", to: "button", kind: "contains" },
    { from: "button", to: "fn", kind: "invokes" },
    { from: "fn", to: "api", kind: "calls-api" },
    { from: "api", to: "db", kind: "reads-data" },
  ],
};

const base: Code360Graph = { nodes: {}, edges: [] };
const merged = mergeWebStructureIntoCode360(base, web);

const routeType = mapWebNodeToCode360NodeType(web.nodes.page!);
const callType = mapWebEdgeToCode360EdgeType(web.edges[1]!);

void merged;
void routeType;
void callType;
