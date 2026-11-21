// ============================================================
// index.ts — نقطة البداية
// ============================================================

import * as dotenv from "dotenv";
dotenv.config();

import { targets } from "./config/targets";
import { runAllTargets } from "./runner/watchRunner";
import { printSummary } from "./notifier/notifier";

// ============================================================
// التحقق من الإعداد
// ============================================================

if (targets.length === 0) {
  console.error("✖ لا توجد أهداف محددة في src/config/targets.ts");
  process.exit(1);
}

// ============================================================
// تشغيل الأداة
// ============================================================

async function main(): Promise<void> {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║   🕵️  Smart Page Watcher & Extractor       ║");
  console.log("╚════════════════════════════════════════════╝");
  console.log(`\n📌 Total Targets: ${targets.length}`);
  console.log(`🕐 Started At: ${new Date().toISOString()}\n`);

  try {
    const reports = await runAllTargets(targets);
    printSummary(reports);

    const hasErrors = reports.some((r) => !r.success);
    process.exit(hasErrors ? 1 : 0);

  } catch (error) {
    console.error("\n✖ Fatal error:", (error as Error).message);
    process.exit(1);
  }
}

main();
