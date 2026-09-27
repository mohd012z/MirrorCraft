"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createStudioRecoveryRecord,
  type StudioRecoveryRecord,
} from "@/mirrorcraft/studio-recovery";
import {
  clearStudioRecovery,
  loadStudioRecovery,
  saveStudioRecovery,
} from "@/mirrorcraft/studio-recovery/storage";
import {
  createStudioHistory,
  createStudioSnapshot,
  summarizeStudioDiff,
  type StudioHistory,
  type StudioSnapshot,
} from "@/mirrorcraft/studio-history";

export type StudioRecoveryStatus =
  | "checking"
  | "active"
  | "available"
  | "invalid"
  | "error";

export interface StudioRecoveryController {
  status: StudioRecoveryStatus;
  record: StudioRecoveryRecord | null;
  lastSavedAt: string | null;
  error: string | null;
  restore: () => void;
  discard: () => void;
}

export interface UseStudioRecoveryOptions {
  projectId: string;
  history: StudioHistory;
  onHistoryChange: (history: StudioHistory) => void;
  autosaveDelayMs?: number;
}

function snapshotHasMeaningfulChanges(
  baseline: StudioSnapshot,
  candidate: StudioSnapshot,
): boolean {
  const diff = summarizeStudioDiff(baseline, candidate);
  return (
    diff.sections.added.length > 0 ||
    diff.sections.removed.length > 0 ||
    diff.sections.moved.length > 0 ||
    diff.sections.hiddenChanged.length > 0 ||
    diff.sections.variantChanged.length > 0 ||
    diff.content.added.length > 0 ||
    diff.content.removed.length > 0 ||
    diff.content.changed.length > 0
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Studio recovery storage is unavailable";
}

export function useStudioRecovery({
  projectId,
  history,
  onHistoryChange,
  autosaveDelayMs = 750,
}: UseStudioRecoveryOptions): StudioRecoveryController {
  const [status, setStatus] = useState<StudioRecoveryStatus>("checking");
  const [record, setRecord] = useState<StudioRecoveryRecord | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const historyRef = useRef(history);
  const onHistoryChangeRef = useRef(onHistoryChange);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    onHistoryChangeRef.current = onHistoryChange;
  }, [onHistoryChange]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStatus("checking");
      setRecord(null);
      setError(null);

      const baseline = createStudioSnapshot(
        historyRef.current.present.composition,
        historyRef.current.present.content,
      );

      try {
        const loaded = loadStudioRecovery(window.localStorage, projectId);
        if (loaded.status === "empty") {
          setLastSavedAt(null);
          setStatus("active");
          return;
        }

        if (loaded.status === "invalid") {
          setLastSavedAt(null);
          setError(loaded.error);
          setStatus("invalid");
          return;
        }

        setLastSavedAt(loaded.record.savedAt);
        if (snapshotHasMeaningfulChanges(baseline, loaded.record.snapshot)) {
          setRecord(loaded.record);
          setStatus("available");
        } else {
          setStatus("active");
        }
      } catch (storageError) {
        setError(errorMessage(storageError));
        setStatus("error");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [projectId]);

  useEffect(() => {
    if (status !== "active") return undefined;

    const delay = Math.max(50, Math.floor(autosaveDelayMs));
    const timer = window.setTimeout(() => {
      try {
        const nextRecord = createStudioRecoveryRecord(projectId, history);
        saveStudioRecovery(window.localStorage, nextRecord);
        setLastSavedAt(nextRecord.savedAt);
        setError(null);
      } catch (storageError) {
        setError(errorMessage(storageError));
        setStatus("error");
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [autosaveDelayMs, history, projectId, status]);

  const restore = useCallback(() => {
    if (!record) return;

    const nextHistory = createStudioHistory(
      createStudioSnapshot(record.snapshot.composition, record.snapshot.content),
      historyRef.current.limit,
    );
    onHistoryChangeRef.current(nextHistory);
    setLastSavedAt(record.savedAt);
    setRecord(null);
    setError(null);
    setStatus("active");
  }, [record]);

  const discard = useCallback(() => {
    try {
      clearStudioRecovery(window.localStorage, projectId);
      setRecord(null);
      setLastSavedAt(null);
      setError(null);
      setStatus("active");
    } catch (storageError) {
      setError(errorMessage(storageError));
      setStatus("error");
    }
  }, [projectId]);

  return {
    status,
    record,
    lastSavedAt,
    error,
    restore,
    discard,
  };
}
