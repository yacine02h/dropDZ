// ============================================================
// browserClient.ts — Browser Controller
// مسؤول عن: فتح المتصفح، الانتقال للرابط، الانتظار الذكي، الإغلاق الآمن
// ============================================================

import { chromium, Browser, BrowserContext, Page } from "playwright";
import * as dotenv from "dotenv";

dotenv.config();

// قراءة الإعدادات من .env أو القيم الافتراضية
const HEADLESS = process.env.HEADLESS !== "false"; // افتراضي: true
const PAGE_TIMEOUT = parseInt(process.env.PAGE_TIMEOUT || "30000", 10);
const ELEMENT_TIMEOUT = parseInt(process.env.ELEMENT_TIMEOUT || "15000", 10);

/**
 * يمثّل جلسة متصفح مفتوحة
 * استخدم دائماً try/finally لضمان الإغلاق
 */
export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

/**
 * يفتح متصفحاً جديداً وينشئ صفحة جديدة.
 * الإعدادات مأخوذة من .env
 */
export async function openBrowser(): Promise<BrowserSession> {
  console.log(`🌐 Launching browser (headless=${HEADLESS})...`);

  const browser = await chromium.launch({ headless: HEADLESS });

  const context = await browser.newContext({
    // نتظاهر بأننا متصفح عادي لتجنب الحجب
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "ar-DZ",
  });

  const page = await context.newPage();

  // إعداد المهل القصوى
  page.setDefaultTimeout(ELEMENT_TIMEOUT);
  page.setDefaultNavigationTimeout(PAGE_TIMEOUT);

  return { browser, context, page };
}

/**
 * ينتقل إلى رابط ويمنتظر اكتمال تحميل الشبكة (networkidle).
 * يرجع true عند النجاح، false عند الخطأ.
 */
export async function navigateTo(page: Page, url: string): Promise<boolean> {
  try {
    console.log(`  ↳ Navigating to: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {
      console.log("  ⚠️  Network idle timed out, proceeding...");
    });
    return true;
  } catch (error) {
    console.error(`  ✖ Navigation failed: ${(error as Error).message}`);
    return false;
  }
}

export async function waitForElement(
  page: Page,
  selector: string,
  timeout?: number
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, {
      state: "visible",
      timeout: timeout ?? ELEMENT_TIMEOUT,
    });
    return true;
  } catch {
    return false;
  }
}

export async function closeBrowser(session: BrowserSession): Promise<void> {
  try {
    await session.context.close();
    await session.browser.close();
    console.log("🔒 Browser closed.");
  } catch (error) {
    console.error("⚠️ Error while closing browser:", (error as Error).message);
  }
}
