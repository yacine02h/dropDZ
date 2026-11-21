// ============================================================
// targetsStore.ts — Persistent target management (data/targets.json)
// ============================================================
import * as fs from "fs";
import * as path from "path";
import { WatchTarget } from "../types/watcher.types";

const TARGETS_PATH = path.resolve("./data/targets.json");

function readTargets(): WatchTarget[] {
  if (!fs.existsSync(TARGETS_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(TARGETS_PATH, "utf-8")) as WatchTarget[];
  } catch {
    return [];
  }
}

function writeTargets(targets: WatchTarget[]): void {
  const dir = path.dirname(TARGETS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TARGETS_PATH, JSON.stringify(targets, null, 2), "utf-8");
}

export function getAllTargets(): WatchTarget[] {
  return readTargets();
}

export function getTargetById(id: string): WatchTarget | null {
  return readTargets().find((t) => t.id === id) ?? null;
}

export function addTarget(target: WatchTarget): void {
  const targets = readTargets();
  if (targets.find((t) => t.id === target.id)) {
    throw new Error(`Target with id "${target.id}" already exists`);
  }
  targets.push(target);
  writeTargets(targets);
}

export function removeTarget(id: string): boolean {
  const targets = readTargets();
  const index = targets.findIndex((t) => t.id === id);
  if (index === -1) return false;
  targets.splice(index, 1);
  writeTargets(targets);
  return true;
}

export function updateTarget(id: string, updated: WatchTarget): boolean {
  const targets = readTargets();
  const index = targets.findIndex((t) => t.id === id);
  if (index === -1) return false;
  targets[index] = updated;
  writeTargets(targets);
  return true;
}
