export type SensitiveRedactionCategory =
  | "bearer-token"
  | "credential-assignment"
  | "cookie"
  | "private-key"
  | "database-url"
  | "known-token";

export interface SensitiveRedactionResult {
  text: string;
  redacted: boolean;
  count: number;
  categories: readonly SensitiveRedactionCategory[];
}

interface RedactionAccumulator {
  text: string;
  count: number;
  categories: Set<SensitiveRedactionCategory>;
}

function replaceSensitivePattern(
  state: RedactionAccumulator,
  pattern: RegExp,
  category: SensitiveRedactionCategory,
  replacement: string | ((...args: string[]) => string),
): void {
  state.text = state.text.replace(pattern, (...args: string[]) => {
    state.count += 1;
    state.categories.add(category);
    if (typeof replacement === "string") return replacement;
    return replacement(...args);
  });
}

export function redactSensitiveText(input: string): SensitiveRedactionResult {
  const state: RedactionAccumulator = {
    text: input,
    count: 0,
    categories: new Set<SensitiveRedactionCategory>(),
  };

  replaceSensitivePattern(
    state,
    /-----BEGIN(?: [A-Z0-9]+)* PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z0-9]+)* PRIVATE KEY-----/g,
    "private-key",
    "[REDACTED PRIVATE KEY]",
  );

  replaceSensitivePattern(
    state,
    /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
    "bearer-token",
    "Bearer [REDACTED]",
  );

  replaceSensitivePattern(
    state,
    /\b(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s"'<>]+/gi,
    "database-url",
    (_match, scheme) => `${scheme}://[REDACTED]`,
  );

  replaceSensitivePattern(
    state,
    /(^|\n)(Cookie|Set-Cookie)\s*:\s*[^\r\n]*/gi,
    "cookie",
    (_match, prefix, header) => `${prefix}${header}: [REDACTED]`,
  );

  replaceSensitivePattern(
    state,
    /\b(api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|oauth[_-]?code|password|passwd|database_url|db_url)\s*([=:])\s*("[^"]*"|'[^']*'|[^\s,;]+)/gi,
    "credential-assignment",
    (_match, name, separator) => `${name}${separator}[REDACTED]`,
  );

  replaceSensitivePattern(
    state,
    /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{30,})\b/g,
    "known-token",
    "[REDACTED TOKEN]",
  );

  return {
    text: state.text,
    redacted: state.count > 0,
    count: state.count,
    categories: [...state.categories],
  };
}
