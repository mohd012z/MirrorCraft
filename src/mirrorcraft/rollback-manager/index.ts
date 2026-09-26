export interface RollbackCheckpoint {
  id: string;
  revision: string;
  createdAt: string;
  files: Array<{ path: string; sha256: string }>;
  reason: string;
  restorable: boolean;
}

export interface RollbackPlan {
  checkpointId: string;
  fromRevision: string;
  toRevision: string;
  affectedFiles: string[];
  warnings: string[];
}

export function createRollbackPlan(
  currentRevision: string,
  checkpoint: RollbackCheckpoint,
  currentFiles: Array<{ path: string; sha256: string }>,
): RollbackPlan {
  if (!checkpoint.restorable) throw new Error(`Checkpoint ${checkpoint.id} is not restorable.`);

  const checkpointMap = new Map(checkpoint.files.map((file) => [file.path, file.sha256]));
  const currentMap = new Map(currentFiles.map((file) => [file.path, file.sha256]));
  const allPaths = new Set([...checkpointMap.keys(), ...currentMap.keys()]);
  const affectedFiles = [...allPaths].filter((path) => checkpointMap.get(path) !== currentMap.get(path)).sort();
  const warnings: string[] = [];

  if (affectedFiles.length === 0) warnings.push("Current workspace already matches the selected checkpoint fingerprint set.");

  return {
    checkpointId: checkpoint.id,
    fromRevision: currentRevision,
    toRevision: checkpoint.revision,
    affectedFiles,
    warnings,
  };
}

export function canRollback(checkpoint: RollbackCheckpoint): boolean {
  return checkpoint.restorable && checkpoint.files.length > 0;
}
