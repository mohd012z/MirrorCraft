import {
  BUTTON_SIZE_PRESETS,
  BUTTON_SHADOW_PRESETS,
  COLOR_PALETTES,
  LINE_HEIGHT_PRESETS,
  LETTER_SPACING_PRESETS,
  SECTION_PRESETS,
  SPACING_PRESETS,
  TEXT_ALIGN_PRESETS,
  findSectionPreset,
} from "@/mirrorcraft/design-library";

const hero = findSectionPreset("hero", "split-media");
if (!hero) throw new Error("Expected split hero preset");
if (hero.slots.length < 3) throw new Error("Hero presets must expose reusable content slots");

if (SECTION_PRESETS.length < 12) throw new Error("Expected a broader reusable section library");
if (COLOR_PALETTES.length < 6) throw new Error("Expected multiple color palettes");
if (BUTTON_SIZE_PRESETS.length < 4) throw new Error("Expected button size options");
if (BUTTON_SHADOW_PRESETS.length < 4) throw new Error("Expected button shadow options");
if (LINE_HEIGHT_PRESETS.length < 4) throw new Error("Expected line-height options");
if (LETTER_SPACING_PRESETS.length < 4) throw new Error("Expected letter-spacing options");
if (TEXT_ALIGN_PRESETS.length < 4) throw new Error("Expected text alignment options");
if (SPACING_PRESETS.length < 5) throw new Error("Expected spacing scale presets");
