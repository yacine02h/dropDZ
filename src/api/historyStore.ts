// ============================================================
// historyStore.ts — Check history (data/history.json)
// Keeps last 100 check events for the activity feed
// ============================================================
import * as fs from "fs";
import * as path from "path";
import { RunReport } from "../types/watcher.types";

const HISTORY_PATH = path.resolve("./data/history.json");
const MAX_ENTRIES = 100;

export interface HistoryEntry {
  id: string;
  targetId: string;
  targetName: string;
  timestamp: string;
  success: boolean;
  hasChanges: boolean;
  changesCount: number;
  changes: Array<{ name: string; oldValue: string | null; newValue: string | null; changeType: string }>;
  error?: string;
}

function readHistory(): HistoryEntry[] {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8")) as HistoryEntry[];
  } catch {
    return [];
  }
}

function writeHistory(history: HistoryEntry[]): void {
  const dir = path.dirname(HISTORY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), "utf-8");
}

export function appendHistory(report: RunReport): void {
  const history = readHistory();
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    targetId: report.targetId,
    targetName: report.targetName,
    timestamp: report.timestamp,
    success: report.success,
    hasChanges: report.diff?.hasChanges ?? false,
    changesCount: report.diff?.changes.filter((c) => c.changeType !== "unchanged").length ?? 0,
    changes: (report.diff?.changes ?? [])
      .filter((c) => c.changeType !== "unchanged")
      .map((c) => ({ name: c.name, oldValue: c.oldValue, newValue: c.newValue, changeType: c.changeType })),
    error: report.error,
  };
  history.unshift(entry); // newest first
  writeHistory(history.slice(0, MAX_ENTRIES));
}

export function getHistory(limit = 50): HistoryEntry[] {
  return readHistory().slice(0, limit);
}

export function getTargetHistory(targetId: string, limit = 20): HistoryEntry[] {
  return readHistory().filter((e) => e.targetId === targetId).slice(0, limit);
}
