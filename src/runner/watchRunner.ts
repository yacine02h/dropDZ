// ============================================================
// watchRunner.ts — Runner / Orchestrator
// مسؤول عن: تنسيق دورة العمل الكاملة لكل هدف
// (تشغيل → سحب → مقارنة → حفظ → تنبيه)
// ============================================================

import { WatchTarget, PageSnapshot, RunReport } from "../types/watcher.types";
import { openBrowser, navigateTo, closeBrowser } from "../browser/browserClient";
import { extractPage } from "../extractor/pageExtractor";
import { computeDiff } from "../diff/diffEngine";
import { getLastSnapshot, saveSnapshot } from "../storage/snapshotStore";
import { notify } from "../notifier/notifier";

// ============================================================
// فحص هدف واحد
// ============================================================

/**
 * ينفّذ دورة فحص كاملة لهدف واحد:
 * 1. يفتح المتصفح
 * 2. يذهب للرابط
 * 3. يستخرج البيانات
 * 4. يقارنها بالسابق
 * 5. يحفظ ويُبلّغ
 */
async function runTarget(target: WatchTarget): Promise<RunReport> {
  console.log(`\n🔍 Checking target: "${target.name}"`);
  console.log(`   URL: ${target.url}`);

  const timestamp = new Date().toISOString();
  const session = await openBrowser();

  try {
    // ── الخطوة 2: الانتقال للرابط ──────────────────────────
    const navigated = await navigateTo(session.page, target.url);
    if (!navigated) {
      const report: RunReport = {
        targetId: target.id,
        targetName: target.name,
        timestamp,
        success: false,
        diff: null,
        error: "فشل الانتقال للرابط",
      };
      await notify(report);
      return report;
    }

    // ── الخطوة 3: استخراج البيانات ─────────────────────────
    const newSnapshot: PageSnapshot = await extractPage(session.page, target);

    // ── الخطوة 4: مقارنة بالسابق ───────────────────────────
    const oldSnapshot = getLastSnapshot(target.id);
    const diff = computeDiff(target, newSnapshot, oldSnapshot);

    // ── الخطوة 5: حفظ وتنبيه ───────────────────────────────
    saveSnapshot(newSnapshot);

    const report: RunReport = {
      targetId: target.id,
      targetName: target.name,
      timestamp,
      success: true,
      diff,
    };

    await notify(report);
    return report;

  } catch (error) {
    const errorMsg = (error as Error).message;
    console.error(`  ✖ خطأ غير متوقع: ${errorMsg}`);

    const report: RunReport = {
      targetId: target.id,
      targetName: target.name,
      timestamp,
      success: false,
      diff: null,
      error: errorMsg,
    };
    await notify(report);
    return report;

  } finally {
    // ضمان إغلاق المتصفح دائماً حتى عند الخطأ
    await closeBrowser(session);
  }
}

// ============================================================
// فحص قائمة كاملة من الأهداف (تسلسلي لتجنب ضغط الموارد)
// ============================================================

/**
 * يفحص جميع الأهداف بالتسلسل (واحداً تلو الآخر).
 * يمكن تعديله لاحقاً ليعمل بالتوازي إذا أردت.
 */
export async function runAllTargets(
  targets: WatchTarget[]
): Promise<RunReport[]> {
  const reports: RunReport[] = [];

  for (const target of targets) {
    const report = await runTarget(target);
    reports.push(report);
  }

  return reports;
}
