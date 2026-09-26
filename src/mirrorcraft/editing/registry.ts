import type { EditParameterDefinition } from "@/mirrorcraft/editing/types";

const PARAMETERS: EditParameterDefinition[] = [
  { id: "content.text", category: "content", label: "Text", valueType: "string", reversible: true, verification: { level: "visual", required: true } },
  { id: "url.href", category: "url", label: "URL", valueType: "string", reversible: true, verification: { level: "compile", required: true } },
  { id: "asset.image", category: "asset", label: "Image", valueType: "object", reversible: true, verification: { level: "visual", required: true } },
  { id: "asset.icon", category: "asset", label: "Icon", valueType: "string", reversible: true, verification: { level: "visual", required: true } },
  { id: "advanced.prompt", category: "advanced", label: "AI Edit Prompt", valueType: "string", reversible: true, verification: { level: "full", required: true } },
  { id: "style.css", category: "style", label: "Style", valueType: "object", reversible: true, verification: { level: "visual", required: true } },
  { id: "color.value", category: "color", label: "Color", valueType: "string", reversible: true, verification: { level: "visual", required: true } },
  { id: "gradient.value", category: "gradient", label: "Gradient", valueType: "object", reversible: true, verification: { level: "visual", required: true } },
  { id: "button.config", category: "button", label: "Button", valueType: "object", reversible: true, verification: { level: "full", required: true } },
  { id: "view.override", category: "view", label: "Viewport Override", valueType: "object", reversible: true, verification: { level: "visual", required: true } },
  { id: "restructure.operation", category: "restructure", label: "Restructure", valueType: "object", reversible: true, verification: { level: "full", required: true } },
  { id: "rename.symbol", category: "rename", label: "Rename", valueType: "string", reversible: true, verification: { level: "full", required: true } },
  { id: "template.apply", category: "template", label: "Template", valueType: "object", reversible: true, verification: { level: "full", required: true } },
  { id: "design.tokens", category: "design", label: "Design Tokens", valueType: "object", reversible: true, verification: { level: "visual", required: true } },
  { id: "access.state", category: "access", label: "Access State", valueType: "object", reversible: true, verification: { level: "full", required: true } },
  { id: "panel.config", category: "panel", label: "Panel", valueType: "object", reversible: true, verification: { level: "visual", required: true } },
  { id: "shape.config", category: "shape", label: "Shape", valueType: "object", reversible: true, verification: { level: "visual", required: true } },
  { id: "animation.config", category: "animation", label: "Animation", valueType: "object", reversible: true, verification: { level: "visual", required: true } },
  { id: "form.config", category: "form", label: "Form", valueType: "object", reversible: true, verification: { level: "full", required: true } },
  { id: "metadata.value", category: "metadata", label: "Metadata", valueType: "object", reversible: true, verification: { level: "compile", required: true } },
];

const PARAMETER_MAP = new Map(PARAMETERS.map((parameter) => [parameter.id, parameter]));

export function getEditParameter(id: string): EditParameterDefinition | undefined {
  return PARAMETER_MAP.get(id);
}

export function listEditParameters(): EditParameterDefinition[] {
  return [...PARAMETERS];
}
