// ============================================================
// snapshotStore.ts — Storage
// مسؤول عن: قراءة وكتابة اللقطات من/إلى ملف JSON
// ============================================================

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { PageSnapshot } from "../types/watcher.types";

dotenv.config();

// مسار ملف التخزين (قابل للتخصيص عبر .env)
const SNAPSHOTS_PATH = path.resolve(
  process.env.SNAPSHOTS_PATH ?? "./data/snapshots.json"
);

// ============================================================
// هيكل الملف
// ============================================================

/**
 * الملف مخزّن بهذا الشكل:
 * {
 *   "example-product": { ...PageSnapshot },
 *   "my-product": { ...PageSnapshot },
 *   ...
 * }
 */
type SnapshotStore = Record<string, PageSnapshot>;

// ============================================================
// قراءة الملف
// ============================================================

function readStore(): SnapshotStore {
  if (!fs.existsSync(SNAPSHOTS_PATH)) {
    return {}; // ملف غير موجود بعد → قاموس فارغ
  }

  try {
    const raw = fs.readFileSync(SNAPSHOTS_PATH, "utf-8");
    return JSON.parse(raw) as SnapshotStore;
  } catch (error) {
    console.error("⚠️ تعذّر قراءة ملف اللقطات:", (error as Error).message);
    return {};
  }
}

// ============================================================
// كتابة الملف
// ============================================================

function writeStore(store: SnapshotStore): void {
  // تأكد من وجود المجلد
  const dir = path.dirname(SNAPSHOTS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    fs.writeFileSync(SNAPSHOTS_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (error) {
    console.error("✖ تعذّر حفظ ملف اللقطات:", (error as Error).message);
    throw error;
  }
}

// ============================================================
// API العامة
// ============================================================

/**
 * يرجع آخر لقطة محفوظة لهدف معين، أو null إذا لم توجد.
 */
export function getLastSnapshot(targetId: string): PageSnapshot | null {
  const store = readStore();
  return store[targetId] ?? null;
}

/**
 * يحفظ لقطة جديدة (يستبدل القديمة إذا وُجدت).
 */
export function saveSnapshot(snapshot: PageSnapshot): void {
  const store = readStore();
  store[snapshot.targetId] = snapshot;
  writeStore(store);
  console.log(`  💾 Snapshot saved (${snapshot.targetId}) @ ${snapshot.timestamp}`);
}

/**
 * يحذف لقطة هدف معين (للاختبار أو إعادة البدء).
 */
export function clearSnapshot(targetId: string): void {
  const store = readStore();
  if (targetId in store) {
    delete store[targetId];
    writeStore(store);
    console.log(`🗑️ تم حذف لقطة: ${targetId}`);
  }
}

/**
 * يرجع قائمة بكل اللقطات المحفوظة.
 */
export function listSnapshots(): PageSnapshot[] {
  return Object.values(readStore());
}
