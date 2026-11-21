// ============================================================
// watcher.types.ts — كل أنواع البيانات (Interfaces & Types)
// ============================================================

/**
 * محدد عنصر واحد داخل الصفحة
 * مثال: { name: "price", selector: ".price-box span", type: "text" }
 */
export interface FieldSelector {
  /** اسم وصفي للحقل (مثل "price", "title", "availability") */
  name: string;
  /** CSS selector أو XPath للعنصر داخل الصفحة */
  selector: string;
  /** نوع البيانات المطلوب استخراجها */
  type: "text" | "href" | "src" | "innerHTML" | "count";
}

/**
 * هدف مراقبة واحد (صفحة + محدداتها)
 */
export interface WatchTarget {
  /** معرّف فريد للهدف */
  id: string;
  /** اسم وصفي للهدف (مثل "iPhone 15 Price") */
  name: string;
  /** رابط الصفحة المراد مراقبتها */
  url: string;
  /** قائمة الحقول المطلوب استخراجها */
  fields: FieldSelector[];
  /**
   * شرط التنبيه (اختياري):
   * "any_change"  → أي تغيير يُعدّ حدثاً
   * "price_drop"  → فقط إذا انخفض الرقم
   */
  alertCondition?: "any_change" | "price_drop";
}

// ============================================================
// نتائج الاستخراج
// ============================================================

/**
 * قيمة حقل مستخرج من الصفحة
 */
export interface ExtractedField {
  name: string;
  /** القيمة الخام المستخرجة (أو null إذا لم يُعثر على العنصر) */
  rawValue: string | null;
  /** القيمة بعد التنظيف (أرقام نظيفة، نصوص بدون مسافات زائدة...) */
  cleanValue: string | null;
  /** هل تم العثور على العنصر؟ */
  found: boolean;
}

/**
 * نتيجة استخراج صفحة كاملة
 */
export interface PageSnapshot {
  /** معرّف الهدف */
  targetId: string;
  /** وقت أخذ اللقطة (ISO string) */
  timestamp: string;
  /** هل نجح الفحص؟ */
  success: boolean;
  /** رسالة الخطأ إن وُجدت */
  error?: string;
  /** الحقول المستخرجة */
  fields: ExtractedField[];
}

// ============================================================
// نتائج المقارنة (Diff)
// ============================================================

/**
 * تغيير على حقل واحد
 */
export interface FieldDiff {
  name: string;
  oldValue: string | null;
  newValue: string | null;
  /** نوع التغيير */
  changeType: "added" | "removed" | "modified" | "unchanged";
}

/**
 * نتيجة مقارنة لقطتين
 */
export interface DiffResult {
  targetId: string;
  timestamp: string;
  /** هل تغير شيء؟ */
  hasChanges: boolean;
  /** تفاصيل التغييرات */
  changes: FieldDiff[];
}

// ============================================================
// تقرير دورة عمل كاملة
// ============================================================

export interface RunReport {
  targetId: string;
  targetName: string;
  timestamp: string;
  success: boolean;
  diff: DiffResult | null;
  error?: string;
}
