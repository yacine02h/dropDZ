# 🕵️ Smart Page Watcher & Extractor

> أداة مراقبة وسحب بيانات ذكية للمتصفح — تفتح صفحة، تستخرج بياناتها، تقارنها بالسابق، وتُنبّهك عند حدوث تغيير.

---

## ⚡ فكرة الأداة بـ 5 خطوات

```
index.ts
  └─► watchRunner.ts        ← يُنسّق دورة العمل لكل هدف
        ├─► targets.ts       ← يقرأ الروابط والمحددات
        ├─► browserClient.ts ← يفتح المتصفح وينتظر ذكياً
        ├─► pageExtractor.ts ← يستخرج البيانات ويُنظّفها
        ├─► diffEngine.ts    ← يقارن الجديد بالسابق
        ├─► snapshotStore.ts ← يحفظ اللقطة الجديدة
        └─► notifier.ts      ← يطبع التقرير أو يُرسل تنبيهاً
```

---

## 🗂️ هيكل المشروع

```
page-watcher/
├── src/
│   ├── config/
│   │   └── targets.ts           # ← أضف أهدافك هنا
│   ├── types/
│   │   └── watcher.types.ts     # Interfaces & Types
│   ├── browser/
│   │   └── browserClient.ts     # Playwright controller
│   ├── extractor/
│   │   └── pageExtractor.ts     # Data extraction & cleaning
│   ├── diff/
│   │   └── diffEngine.ts        # Change detection
│   ├── storage/
│   │   └── snapshotStore.ts     # JSON persistence
│   ├── notifier/
│   │   └── notifier.ts          # Terminal output & Webhook
│   ├── runner/
│   │   └── watchRunner.ts       # Orchestrator
│   └── index.ts                 # Entry point
├── data/
│   └── snapshots.json           # (مُنشأ تلقائياً)
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 طريقة التشغيل

### 1. تثبيت الاعتماديات

```bash
npm install
npx playwright install chromium
```

### 2. إعداد البيئة

```bash
cp .env.example .env
# عدّل .env حسب حاجتك
```

### 3. إضافة أهدافك

افتح `src/config/targets.ts` وأضف هدفاً:

```typescript
{
  id: "my-product",
  name: "My Product Watch",
  url: "https://example.com/product/123",
  fields: [
    { name: "price",        selector: ".price",        type: "text" },
    { name: "availability", selector: ".stock-status", type: "text" },
  ],
  alertCondition: "any_change",
}
```

### 4. تشغيل الأداة

```bash
# وضع التطوير (بدون build)
npm run dev

# وضع الإنتاج
npm run build
npm start
```

---

## ⚙️ متغيرات البيئة (.env)

| المتغير | الوصف | الافتراضي |
|---------|-------|-----------|
| `HEADLESS` | تشغيل المتصفح مخفياً | `true` |
| `ELEMENT_TIMEOUT` | انتظار ظهور العنصر (ms) | `15000` |
| `PAGE_TIMEOUT` | انتظار تحميل الصفحة (ms) | `30000` |
| `SNAPSHOTS_PATH` | مسار ملف اللقطات | `./data/snapshots.json` |
| `WEBHOOK_URL` | رابط Webhook للتنبيهات | (فارغ = معطّل) |

---

## 📋 أنواع الحقول المدعومة

| `type` | ما يستخرجه |
|--------|-----------|
| `text` | النص الداخلي للعنصر |
| `innerHTML` | HTML الداخلية (للعناصر المعقدة) |
| `href` | قيمة رابط `<a>` |
| `src` | رابط صورة أو مورد |
| `count` | عدد العناصر المطابقة للمحدد |

---

## 🔔 شروط التنبيه

| `alertCondition` | يُنبّه عند |
|-----------------|-----------|
| `any_change` *(افتراضي)* | أي تغيير في أي حقل |
| `price_drop` | انخفاض قيمة حقل اسمه يحتوي على "price" |

---

## 📌 ملاحظات للمطور

- **اللقطات** تُحفظ في `data/snapshots.json` — يمكن حذف ملف الهدف لإعادة البدء من صفر.
- **المتصفح**: يستخدم Chromium عبر Playwright — يمكن تغييره لـ Firefox أو WebKit في `browserClient.ts`.
- **التوسع لاحقاً**: يمكن ربط هذه الأداة بـ React Dashboard أو قاعدة بيانات SQLite بدلاً من JSON.

---

## 🧩 الخطوات القادمة (Roadmap)

- [ ] إضافة جدولة زمنية (`node-cron`) للفحص التلقائي كل X دقيقة
- [ ] لوحة تحكم React لعرض الأهداف وسجل التغييرات
- [ ] دعم SQLite بدلاً من JSON للمشاريع الكبيرة
- [ ] تنبيهات بريد إلكتروني أو Telegram
