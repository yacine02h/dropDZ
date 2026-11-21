// ============================================================
// diffEngine.ts — Diff Engine
// مسؤول عن: مقارنة لقطتين واكتشاف ما الذي تغيّر
// ============================================================

import {
  PageSnapshot,
  DiffResult,
  FieldDiff,
  WatchTarget,
} from "../types/watcher.types";

// ============================================================
// مقارنة حقل واحد
// ============================================================

function diffField(
  name: string,
  oldValue: string | null,
  newValue: string | null
): FieldDiff {
  let changeType: FieldDiff["changeType"];

  if (oldValue === null && newValue !== null) {
    changeType = "added";       // ظهر عنصر جديد
  } else if (oldValue !== null && newValue === null) {
    changeType = "removed";     // اختفى عنصر
  } else if (oldValue !== newValue) {
    changeType = "modified";    // تغيّرت القيمة
  } else {
    changeType = "unchanged";   // لا شيء تغيّر
  }

  return { name, oldValue, newValue, changeType };
}

// ============================================================
// شرط التنبيه: price_drop
// ============================================================

/**
 * يتحقق إذا كان تغيير الحقل يمثّل انخفاضاً في السعر
 */
function isPriceDrop(diff: FieldDiff): boolean {
  if (diff.changeType !== "modified") return false;
  if (!diff.name.toLowerCase().includes("price")) return false;

  const oldNum = parseFloat(diff.oldValue ?? "");
  const newNum = parseFloat(diff.newValue ?? "");

  if (isNaN(oldNum) || isNaN(newNum)) return false;
  return newNum < oldNum;
}

// ============================================================
// المقارنة الكاملة بين لقطتين
// ============================================================

/**
 * يقارن لقطة جديدة بلقطة سابقة ويرجع DiffResult.
 * إذا لم تكن هناك لقطة سابقة (أول فحص) → يُعامَل كـ "لا تغيير"
 */
export function computeDiff(
  target: WatchTarget,
  newSnapshot: PageSnapshot,
  oldSnapshot: PageSnapshot | null
): DiffResult {
  const timestamp = new Date().toISOString();

  // أول فحص: لا توجد لقطة سابقة للمقارنة
  if (!oldSnapshot) {
    return {
      targetId: target.id,
      timestamp,
      hasChanges: false,
      changes: newSnapshot.fields.map((f) => ({
        name: f.name,
        oldValue: null,
        newValue: f.cleanValue,
        changeType: "added",
      })),
    };
  }

  // بناء خريطة للقطة القديمة { fieldName → cleanValue }
  const oldMap = new Map<string, string | null>();
  for (const field of oldSnapshot.fields) {
    oldMap.set(field.name, field.cleanValue);
  }

  // مقارنة كل حقل
  const changes: FieldDiff[] = [];
  for (const field of newSnapshot.fields) {
    const oldValue = oldMap.get(field.name) ?? null;
    const diff = diffField(field.name, oldValue, field.cleanValue);
    changes.push(diff);
  }

  // تحديد وجود تغييرات حسب شرط التنبيه
  let hasChanges = false;

  if (target.alertCondition === "price_drop") {
    hasChanges = changes.some(isPriceDrop);
  } else {
    // any_change (الافتراضي)
    hasChanges = changes.some((c) => c.changeType !== "unchanged");
  }

  return { targetId: target.id, timestamp, hasChanges, changes };
}
