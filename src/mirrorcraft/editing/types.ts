export type EditCategory =
  | "rename"
  | "content"
  | "template"
  | "style"
  | "color"
  | "url"
  | "design"
  | "access"
  | "panel"
  | "button"
  | "shape"
  | "gradient"
  | "view"
  | "restructure"
  | "asset"
  | "animation"
  | "form"
  | "metadata"
  | "advanced";

export type EditValue = string | number | boolean | null | Record<string, unknown> | string[];

export interface ViewportScope {
  mode: "all" | "named" | "custom";
  name?: "mobile" | "tablet" | "laptop" | "desktop";
  width?: number;
  height?: number;
}

export interface EditTarget {
  nodeId: string;
  kind: string;
  sourcePath?: string;
  sourceLine?: number;
}

export interface EditVerification {
  level: "none" | "typecheck" | "compile" | "visual" | "full";
  required: boolean;
}

export interface EditOperation {
  id: string;
  category: EditCategory;
  parameterId: string;
  target: EditTarget;
  before?: EditValue;
  after: EditValue;
  viewport: ViewportScope;
  reversible: boolean;
  reason?: string;
  verification: EditVerification;
  metadata?: Record<string, unknown>;
}

export interface EditParameterDefinition {
  id: string;
  category: EditCategory;
  label: string;
  valueType: "string" | "number" | "boolean" | "object" | "string-array";
  verification: EditVerification;
  reversible: boolean;
}
