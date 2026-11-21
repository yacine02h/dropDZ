// ============================================================
// targets.ts — قائمة الأهداف (Config)
// تعديل هذا الملف = تعديل ما تراقبه الأداة
// ============================================================

import { WatchTarget } from "../types/watcher.types";

/**
 * أضف أهدافك هنا.
 * كل هدف هو صفحة + قائمة عناصر تريد متابعتها.
 *
 * مثال 1: متابعة سعر منتج على Amazon
 * مثال 2: متابعة عدد النتائج في صفحة بحث
 */
export const targets: WatchTarget[] = [
  {
    id: "example-product",
    name: "Example: Books to Scrape — Product Price",
    url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
    fields: [
      {
        name: "title",
        selector: "h1",
        type: "text",
      },
      {
        name: "price",
        selector: "p.price_color",
        type: "text",
      },
      {
        name: "availability",
        selector: "p.instock.availability",
        type: "text",
      },
      {
        name: "rating",
        selector: "p.star-rating",
        type: "innerHTML",
      },
    ],
    alertCondition: "any_change",
  },

  // ── أضف أهدافاً إضافية هنا ──────────────────────────────
  // {
  //   id: "my-product",
  //   name: "My Product Watch",
  //   url: "https://example.com/product/123",
  //   fields: [
  //     { name: "price",        selector: ".price",        type: "text" },
  //     { name: "availability", selector: ".stock-status", type: "text" },
  //   ],
  //   alertCondition: "price_drop",
  // },
];
