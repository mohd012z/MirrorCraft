import type { SecretRef } from "@/mirrorcraft/integrations/secrets";
import type {
  IntegrationAuthMode,
  IntegrationCapability,
  IntegrationRegistry,
} from "@/mirrorcraft/integrations/types";

export type IntegrationConnectionHealth =
  | "disconnected"
  | "connecting"
  | "connected"
  | "degraded"
  | "expired"
  | "error";

export interface IntegrationConnection {
  id: string;
  providerId: string;
  authMode: IntegrationAuthMode;
  health: IntegrationConnectionHealth;
  capabilities: readonly IntegrationCapability[];
  secretRefs: readonly SecretRef[];
  createdAt: string;
  checkedAt?: string;
  message?: string;
}

export interface IntegrationConnectionRegistry {
  connections: Readonly<Record<string, IntegrationConnection>>;
}

export interface RegisterIntegrationConnectionInput {
  id: string;
  providerId: string;
  authMode: IntegrationAuthMode;
  health: IntegrationConnectionHealth;
  capabilities: readonly IntegrationCapability[];
  secretRefs?: readonly SecretRef[];
  createdAt: string;
  checkedAt?: string;
  message?: string;
}

export interface ConnectionHealthUpdate {
  checkedAt?: string;
  message?: string;
}

export interface IntegrationConnectionSummary {
  id: string;
  providerId: string;
  authMode: IntegrationAuthMode;
  health: IntegrationConnectionHealth;
  capabilities: readonly IntegrationCapability[];
  hasSecretMaterial: boolean;
  secretCount: number;
  createdAt: string;
  checkedAt?: string;
  message?: string;
}

const SAFE_CONNECTION_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

function normalizeId(value: string, label: string): string {
  const normalized = value.trim();
  if (!SAFE_CONNECTION_ID.test(normalized)) {
    throw new Error(`Invalid integration ${label}`);
  }
  return normalized;
}

function normalizeTimestamp(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized || !Number.isFinite(new Date(normalized).getTime())) {
    throw new Error(`Invalid integration ${label}`);
  }
  return normalized;
}

function normalizeMessage(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function validateSecretRef(
  ref: SecretRef,
  providerId: string,
  connectionId: string,
): SecretRef {
  if (
    ref.scheme !== "secret" ||
    ref.provider !== providerId ||
    ref.connectionId !== connectionId ||
    !ref.secretId.trim()
  ) {
    throw new Error(
      `Secret reference must belong to ${providerId}/${connectionId}`,
    );
  }
  return { ...ref };
}

function normalizeConnection(
  providers: IntegrationRegistry,
  input: RegisterIntegrationConnectionInput,
): IntegrationConnection {
  const id = normalizeId(input.id, "connection id");
  const providerId = normalizeId(input.providerId, "provider id");
  const provider = providers.providers[providerId];
  if (!provider) {
    throw new Error(`Unknown integration provider ${providerId}`);
  }
  if (!provider.authModes.includes(input.authMode)) {
    throw new Error(
      `Integration provider ${providerId} does not support auth mode ${input.authMode}`,
    );
  }

  const capabilities = [...new Set(input.capabilities)];
  const unsupported = capabilities.filter(
    (capability) => !provider.capabilities.includes(capability),
  );
  if (unsupported.length > 0) {
    throw new Error(
      `Integration provider ${providerId} does not support capabilities: ${unsupported.join(", ")}`,
    );
  }

  const secretRefs = (input.secretRefs ?? []).map((ref) =>
    validateSecretRef(ref, providerId, id),
  );
  const seenSecretIds = new Set<string>();
  for (const ref of secretRefs) {
    if (seenSecretIds.has(ref.secretId)) {
      throw new Error(`Duplicate integration secret reference for ${providerId}/${id}`);
    }
    seenSecretIds.add(ref.secretId);
  }

  return {
    id,
    providerId,
    authMode: input.authMode,
    health: input.health,
    capabilities,
    secretRefs,
    createdAt: normalizeTimestamp(input.createdAt, "createdAt"),
    ...(input.checkedAt
      ? { checkedAt: normalizeTimestamp(input.checkedAt, "checkedAt") }
      : {}),
    ...(normalizeMessage(input.message)
      ? { message: normalizeMessage(input.message) }
      : {}),
  };
}

export function createIntegrationConnectionRegistry(
  connections: readonly IntegrationConnection[] = [],
): IntegrationConnectionRegistry {
  const registry: Record<string, IntegrationConnection> = {};
  for (const connection of connections) {
    const id = normalizeId(connection.id, "connection id");
    if (registry[id]) {
      throw new Error(`Integration connection ${id} is already registered`);
    }
    registry[id] = {
      ...connection,
      id,
      capabilities: [...connection.capabilities],
      secretRefs: connection.secretRefs.map((ref) => ({ ...ref })),
    };
  }
  return { connections: registry };
}

export function registerIntegrationConnection(
  registry: IntegrationConnectionRegistry,
  providers: IntegrationRegistry,
  input: RegisterIntegrationConnectionInput,
): IntegrationConnectionRegistry {
  const connection = normalizeConnection(providers, input);
  if (registry.connections[connection.id]) {
    throw new Error(
      `Integration connection ${connection.id} is already registered`,
    );
  }
  return {
    connections: {
      ...registry.connections,
      [connection.id]: connection,
    },
  };
}

export function updateIntegrationConnectionHealth(
  registry: IntegrationConnectionRegistry,
  connectionId: string,
  health: IntegrationConnectionHealth,
  update: ConnectionHealthUpdate = {},
): IntegrationConnectionRegistry {
  const id = normalizeId(connectionId, "connection id");
  const current = registry.connections[id];
  if (!current) {
    throw new Error(`Unknown integration connection ${id}`);
  }

  const next: IntegrationConnection = {
    ...current,
    health,
    ...(update.checkedAt
      ? { checkedAt: normalizeTimestamp(update.checkedAt, "checkedAt") }
      : {}),
    ...(update.message !== undefined
      ? { message: normalizeMessage(update.message) }
      : {}),
  };

  if (update.message !== undefined && next.message === undefined) {
    delete next.message;
  }

  return {
    connections: {
      ...registry.connections,
      [id]: next,
    },
  };
}

export function removeIntegrationConnection(
  registry: IntegrationConnectionRegistry,
  connectionId: string,
): IntegrationConnectionRegistry {
  const id = normalizeId(connectionId, "connection id");
  if (!registry.connections[id]) return registry;
  const { [id]: _removed, ...remaining } = registry.connections;
  void _removed;
  return { connections: remaining };
}

export function getIntegrationConnection(
  registry: IntegrationConnectionRegistry,
  connectionId: string,
): IntegrationConnection | undefined {
  return registry.connections[connectionId.trim()];
}

export function toIntegrationConnectionSummary(
  connection: IntegrationConnection,
): IntegrationConnectionSummary {
  return {
    id: connection.id,
    providerId: connection.providerId,
    authMode: connection.authMode,
    health: connection.health,
    capabilities: [...connection.capabilities],
    hasSecretMaterial: connection.secretRefs.length > 0,
    secretCount: connection.secretRefs.length,
    createdAt: connection.createdAt,
    ...(connection.checkedAt ? { checkedAt: connection.checkedAt } : {}),
    ...(connection.message ? { message: connection.message } : {}),
  };
}

export function listIntegrationConnectionSummaries(
  registry: IntegrationConnectionRegistry,
): readonly IntegrationConnectionSummary[] {
  return Object.values(registry.connections).map(toIntegrationConnectionSummary);
}
