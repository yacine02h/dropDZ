// ============================================================
// notifier.ts — Reporter / Notifier
// مسؤول عن: طباعة النتائج في الطرفية وإرسال تنبيه (Webhook اختياري)
// ============================================================

import * as dotenv from "dotenv";
import { DiffResult, FieldDiff, RunReport } from "../types/watcher.types";

dotenv.config();

const WEBHOOK_URL = process.env.WEBHOOK_URL ?? "";

// ============================================================
// ألوان بسيطة بدون مكتبة خارجية
// (نستخدم ANSI codes مباشرة لتجنب مشاكل التبعيات)
// ============================================================

const COLOR = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  red:    "\x1b[31m",
  cyan:   "\x1b[36m",
  gray:   "\x1b[90m",
};

function colorize(text: string, color: keyof typeof COLOR): string {
  return `${COLOR[color]}${text}${COLOR.reset}`;
}

// ============================================================
// طباعة تقرير واحد في الطرفية
// ============================================================

function printDiff(diff: DiffResult): void {
  if (!diff.hasChanges) {
    console.log(colorize("  ✔ No changes detected — State is stable", "green"));
    return;
  }

  console.log(colorize("\n  ⚡ Changes detected:", "yellow"));

  for (const change of diff.changes) {
    if (change.changeType === "unchanged") continue;
    printFieldChange(change);
  }
}

function printFieldChange(change: FieldDiff): void {
  const icon: Record<FieldDiff["changeType"], string> = {
    added:     "➕",
    removed:   "➖",
    modified:  "✏️ ",
    unchanged: "   ",
  };

  const label = colorize(`[${change.changeType.toUpperCase()}]`, "bold");

  if (change.changeType === "modified") {
    console.log(
      `    ${icon[change.changeType]} ${label} ` +
      colorize(change.name, "cyan") +
      `: "${colorize(change.oldValue ?? "null", "red")}" → "${colorize(change.newValue ?? "null", "green")}"`
    );
  } else if (change.changeType === "added") {
    console.log(
      `    ${icon[change.changeType]} ${label} ` +
      colorize(change.name, "cyan") +
      `: "${colorize(change.newValue ?? "null", "green")}"`
    );
  } else {
    console.log(
      `    ${icon[change.changeType]} ${label} ` +
      colorize(change.name, "cyan") +
      `: "${colorize(change.oldValue ?? "null", "red")}" → deleted`
    );
  }
}

// ============================================================
// إرسال Webhook (اختياري)
// ============================================================

async function sendWebhook(report: RunReport): Promise<void> {
  if (!WEBHOOK_URL) return;

  try {
    // استخدام fetch المدمج في Node.js 18+
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetId: report.targetId,
        targetName: report.targetName,
        timestamp: report.timestamp,
        hasChanges: report.diff?.hasChanges ?? false,
        changes: report.diff?.changes.filter(
          (c) => c.changeType !== "unchanged"
        ) ?? [],
      }),
    });

    if (response.ok) {
      console.log(colorize("  📡 تنبيه Webhook أُرسل بنجاح", "green"));
    } else {
      console.warn(
        colorize(`  ⚠️ Webhook رجع بكود: ${response.status}`, "yellow")
      );
    }
  } catch (error) {
    console.error(
      colorize(`  ✖ فشل إرسال Webhook: ${(error as Error).message}`, "red")
    );
  }
}

// ============================================================
// الدالة الرئيسية للإشعار
// ============================================================

/**
 * يطبع تقرير الفحص ويرسل Webhook إذا كان هناك تغيير وكان WEBHOOK_URL مضبوطاً.
 */
export async function notify(report: RunReport): Promise<void> {
  const separator = colorize("─".repeat(60), "gray");
  const header = `\n${separator}\n` +
    colorize(`🎯 ${report.targetName}`, "bold") +
    colorize(` [${report.targetId}]`, "gray") +
    `\n${colorize("🕐 " + report.timestamp, "gray")}`;

  console.log(header);

  if (!report.success) {
    console.log(colorize(`  ✖ فشل الفحص: ${report.error}`, "red"));
    console.log(separator);
    return;
  }

  if (report.diff) {
    printDiff(report.diff);
  }

  console.log(separator);

  // إرسال Webhook فقط عند وجود تغيير
  if (report.diff?.hasChanges) {
    await sendWebhook(report);
  }
}

/**
 * يطبع ملخصاً نهائياً لكل دورة عمل
 */
export function printSummary(reports: RunReport[]): void {
  const total = reports.length;
  const changed = reports.filter((r) => r.diff?.hasChanges).length;
  const failed = reports.filter((r) => !r.success).length;
  const stable = total - changed - failed;

  console.log(`\n${colorize("═".repeat(60), "cyan")}`);
  console.log(colorize("📊 Execution Summary:", "bold"));
  console.log(`  Total Targets  : ${colorize(String(total), "bold")}`);
  console.log(`  With Changes   : ${colorize(String(changed), changed > 0 ? "yellow" : "green")}`);
  console.log(`  Stable         : ${colorize(String(stable), "green")}`);
  console.log(`  Failed Checks  : ${colorize(String(failed), failed > 0 ? "red" : "green")}`);
  console.log(colorize("═".repeat(60), "cyan") + "\n");
}
