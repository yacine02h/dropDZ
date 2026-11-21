// ============================================================
// pageExtractor.ts — Extractor
// مسؤول عن: قراءة العناصر من الصفحة وتنظيف القيم
// ============================================================

import { Page } from "playwright";
import {
  WatchTarget,
  FieldSelector,
  ExtractedField,
  PageSnapshot,
} from "../types/watcher.types";
import { waitForElement } from "../browser/browserClient";

// ============================================================
// دوال التنظيف (Cleaners)
// ============================================================

/**
 * ينظف نصاً عاماً: يزيل المسافات الزائدة وسطور التنسيق
 */
function cleanText(raw: string | null): string | null {
  if (raw === null) return null;
  return raw
    .replace(/\s+/g, " ")  // مسافات متعددة → مسافة واحدة
    .replace(/\n|\r|\t/g, "") // إزالة أسطر وتابات
    .trim();
}

/**
 * يستخرج الرقم من نص السعر مثل "£51.77" → "51.77"
 */
function cleanPrice(raw: string | null): string | null {
  if (raw === null) return null;
  const match = raw.match(/[\d,.]+/);
  return match ? match[0].replace(/,/g, "") : cleanText(raw);
}

/**
 * يختار دالة التنظيف المناسبة حسب اسم الحقل
 */
function applyClean(name: string, raw: string | null): string | null {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("price") || lowerName.includes("سعر")) {
    return cleanPrice(raw);
  }
  return cleanText(raw);
}

// ============================================================
// استخراج حقل واحد
// ============================================================

/**
 * يستخرج قيمة حقل واحد من الصفحة حسب نوعه
 */
async function extractField(
  page: Page,
  field: FieldSelector
): Promise<ExtractedField> {
  // أولاً: تحقق من وجود العنصر
  const found = await waitForElement(page, field.selector, 5000);

  if (!found) {
    return {
      name: field.name,
      rawValue: null,
      cleanValue: null,
      found: false,
    };
  }

  let rawValue: string | null = null;

  try {
    const locator = page.locator(field.selector).first();

    switch (field.type) {
      case "text":
        rawValue = await locator.innerText();
        break;

      case "innerHTML":
        rawValue = await locator.innerHTML();
        break;

      case "href":
        rawValue = await locator.getAttribute("href");
        break;

      case "src":
        rawValue = await locator.getAttribute("src");
        break;

      case "count":
        // يعدّ كم عنصراً وجد بهذا المحدد
        const count = await page.locator(field.selector).count();
        rawValue = String(count);
        break;

      default:
        rawValue = await locator.innerText();
    }
  } catch (error) {
    console.warn(
      `    ⚠️ تعذّر استخراج "${field.name}": ${(error as Error).message}`
    );
  }

  return {
    name: field.name,
    rawValue,
    cleanValue: applyClean(field.name, rawValue),
    found: true,
  };
}

// ============================================================
// الاستخراج الكامل لصفحة
// ============================================================

/**
 * يستخرج جميع الحقول المطلوبة من الصفحة ويبني PageSnapshot
 */
export async function extractPage(
  page: Page,
  target: WatchTarget
): Promise<PageSnapshot> {
  console.log(`  📋 Extracting ${target.fields.length} field(s)...`);

  const timestamp = new Date().toISOString();
  const fields: ExtractedField[] = [];

  for (const field of target.fields) {
    const result = await extractField(page, field);
    fields.push(result);

    const status = result.found ? "✔" : "✖";
    console.log(
      `    ${status} ${field.name}: ${result.cleanValue ?? "(not found)"}`
    );
  }

  return {
    targetId: target.id,
    timestamp,
    success: true,
    fields,
  };
}
