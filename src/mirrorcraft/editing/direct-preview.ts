import { getEditParameter } from "@/mirrorcraft/editing/registry";
import type { EditOperation, EditTarget, EditValue } from "@/mirrorcraft/editing/types";

export interface DirectPreviewSelection extends EditTarget {}

export type DirectPreviewEditRequest =
  | { type: "text"; value: string }
  | { type: "url"; value: string }
  | { type: "image"; value: string; alt?: string }
  | { type: "icon"; value: string }
  | { type: "prompt"; value: string };

export type ImportFormat = "mirrorcraft" | "zip" | "html" | "json";
export type ExportFormat = "mirrorcraft" | "zip" | "static" | "json";
export type LoadSource = "url" | "repository" | "project" | "file";

export interface ProjectImportRequest {
  format: ImportFormat;
  source: "upload" | "repository" | "url";
  reference?: string;
}

export interface ProjectExportRequest {
  format: ExportFormat;
  includeAssets: boolean;
  includeHistory: boolean;
}

export interface LoadRequest {
  source: LoadSource;
  value: string;
}

const REQUEST_TO_PARAMETER = {
  text: "content.text",
  url: "url.href",
  image: "asset.image",
  icon: "asset.icon",
  prompt: "advanced.prompt",
} as const;

function operationValue(request: DirectPreviewEditRequest): EditValue {
  if (request.type === "image") {
    return { src: request.value, alt: request.alt ?? "" };
  }
  return request.value;
}

function operationId(target: DirectPreviewSelection, request: DirectPreviewEditRequest): string {
  return `${target.nodeId}:${request.type}:${Date.now().toString(36)}`;
}

export function createDirectPreviewEdit(
  selection: DirectPreviewSelection,
  request: DirectPreviewEditRequest,
): EditOperation {
  const parameterId = REQUEST_TO_PARAMETER[request.type];
  const parameter = getEditParameter(parameterId);
  if (!parameter) throw new Error(`Unknown direct preview parameter: ${parameterId}`);

  return {
    id: operationId(selection, request),
    category: parameter.category,
    parameterId,
    target: selection,
    after: operationValue(request),
    viewport: { mode: "all" },
    reversible: parameter.reversible,
    reason: request.type === "prompt" ? request.value : "Direct preview edit",
    verification: parameter.verification,
  };
}

export function createProjectImportRequest(request: ProjectImportRequest): ProjectImportRequest {
  if ((request.source === "repository" || request.source === "url") && !request.reference) {
    throw new Error(`Import source ${request.source} requires a reference.`);
  }
  return { ...request };
}

export function createProjectExportRequest(request: ProjectExportRequest): ProjectExportRequest {
  return { ...request };
}

export function createLoadRequest(request: LoadRequest): LoadRequest {
  if (!request.value.trim()) throw new Error("Load request value cannot be empty.");
  return { ...request, value: request.value.trim() };
}
