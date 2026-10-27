// ------------------------------------------------------------------
// FINANCIAL REPORT
// ------------------------------------------------------------------

import { Project, Transaction } from "@/types";
import { formatCurrency } from "@/utils/format";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";

const LOGO_ASSET = require("@/assets/images/icon.png");

export type ReportSize = "A4" | "MOBILE";

async function getAssetBase64(asset: Asset): Promise<string> {
  await asset.downloadAsync();
  let uri = asset.localUri || asset.uri;

  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    const localFile = FileSystem.documentDirectory + "temp_logo.png";
    await FileSystem.downloadAsync(uri, localFile);
    uri = localFile;
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (readError) {
    console.warn("Reading asset failed, attempting to copy:", readError);
    const fallbackPath = FileSystem.documentDirectory + "fallback_logo.png";
    await FileSystem.copyAsync({ from: uri, to: fallbackPath });
    const base64 = await FileSystem.readAsStringAsync(fallbackPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  }
}

export const getArFinancialReportHtml = async (
  project: Project,
  transactions: Transaction[],
  periodLabel: string = "تاريخ المشروع بالكامل",
  size: ReportSize = "A4",
) => {
  let logoUri = "";

  try {
    const asset = Asset.fromModule(LOGO_ASSET);
    const base64 = await getAssetBase64(asset);
    logoUri = `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error("Failed to load logo for PDF:", error);
  }

  const isMobile = size === "MOBILE";

  const projectTransactions = transactions
    .filter((t) => t.projectId === project.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // -------- Type definition resolvers (drive everything from `project`) --------
  const findDef = (typeId: string) =>
    project.transactionTypes.find((d) => d.id === typeId);

  const getTypeLabel = (typeId: string) => findDef(typeId)?.label ?? typeId;

  const getTypeColor = (typeId: string) => findDef(typeId)?.color ?? "#334155";

  const isInflowType = (typeId: string) =>
    findDef(typeId)?.direction === "INFLOW";

  // -------- Category totals: seeded from project types, plus legacy ids --------
  const categoryTotals: Record<string, number> = {};
  project.transactionTypes.forEach((t) => {
    categoryTotals[t.id] = 0;
  });
  projectTransactions.forEach((t) => {
    if (categoryTotals[t.type] === undefined) categoryTotals[t.type] = 0;
  });
  projectTransactions.forEach((t) => {
    categoryTotals[t.type] += t.amount;
  });

  // -------- Totals: direction-driven, TRANSFER excluded from both --------
  let totalIncome = 0;
  let totalExpenses = 0;
  projectTransactions.forEach((t) => {
    const def = findDef(t.type);
    if (!def || !def.affectsBalance) return;
    if (def.id === "TRANSFER") return;
    if (def.direction === "INFLOW") totalIncome += t.amount;
    else if (def.direction === "OUTFLOW") totalExpenses += t.amount;
  });

  const todayDate = new Date().toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // -------- Category table rows (skip zero-amount rows) --------
  const categoryRows = Object.entries(categoryTotals)
    .filter(([, amount]) => amount !== 0)
    .map(
      ([typeId, amount]) => `
      <tr>
        <td style="padding:8px; border:1px solid #cbd5e1; text-align:right;">
          ${getTypeLabel(typeId)}
        </td>
        <td style="padding:8px; border:1px solid #cbd5e1; text-align:left; color:${getTypeColor(
          typeId,
        )};">
          ${formatCurrency(amount)}
        </td>
      </tr>
    `,
    )
    .join("");

  // -------- Size-specific @page rules --------
  const pageRules = isMobile
    ? `
        @page {
          size: 340pt 600pt; /* tall phone-card page, not A4 */
          margin: 8mm;
        }
      `
    : `
        @page {
          size: A4;
          margin: 10mm;
          @bottom-center {
            content: counter(page);
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 12px;
            color: #555;
          }
        }
      `;

  // -------- Size-specific font + layout overrides --------
  const sizeOverrides = isMobile
    ? `
        body { font-size: 13px; }

        /* Header: tighten whitespace on narrow page */
        .header-container {
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .header-info h1 { font-size: 20px; margin-bottom: 6px; }
        .header-meta { gap: 6px; font-size: 11px; flex-direction: column; align-items: flex-start; }
        .header-meta span { padding: 3px 8px; }
        .logo { width: 70px; height: 70px; border-radius: 8px; margin-left: 6px; }

        /* Both summary cards: tighter padding + no forced page break */
        .summary-card {
          padding: 12px;
          border-radius: 10px;
          margin-bottom: 12px;
          page-break-inside: auto;
        }
        .summary-title {
          font-size: 15px;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }

        /* Balance cards stack to 1 column on phone width */
        .balance-grid { grid-template-columns: 1fr; gap: 8px; }
        .balance-card { padding: 10px; }
        .balance-label { font-size: 12px; margin-bottom: 4px; }
        .balance-value { font-size: 19px; }

        .category-summary td, .category-summary th { padding: 6px; font-size: 11px; }

        h2 { font-size: 15px; margin-bottom: 10px; }

        /* Transaction table: widen the date column so Arabic dates fit
           on one line, and let the description wrap when needed. */
        table.transactions th, table.transactions td {
          padding: 6px;
          font-size: 10.5px;
          white-space: nowrap;
        }
        table.transactions th:nth-child(1),
        table.transactions td:nth-child(1) { width: 20%; }
        table.transactions th:nth-child(2),
        table.transactions td:nth-child(2) { width: 18%; }
        table.transactions th:nth-child(3),
        table.transactions td:nth-child(3) { width: 8%; }
        table.transactions th:nth-child(4),
        table.transactions td:nth-child(4) {
          width: 36%;
          white-space: normal;
          word-break: break-word;
        }
        table.transactions th:nth-child(5),
        table.transactions td:nth-child(5) { width: 18%; }

        .transactions-section { page-break-before: auto; }
      `
    : ``;

  return `
    <html dir="rtl" lang="ar" data-size="${size}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          ${pageRules}
          body { 
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
            margin: 0; 
            padding: 0; 
            color: #334155; 
            direction: rtl; 
            text-align: right; 
          }
          
          /* ---------------- HEADER ---------------- */
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #1e293b;
            padding-bottom: 20px;
            margin-bottom: 25px;
          }
          .header-info { text-align: left; }
          .header-info h1 {
            margin: 0 0 10px 0;
            color: #0f172a;
            font-size: 26px;
          }
          .header-meta {
            display: flex;
            gap: 15px;
            font-size: 13px;
            color: #64748b;
            flex-direction: row-reverse;
          }
          .header-meta span {
            background-color: #f8fafc;
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          .logo {
            width: 100px;
            height: 100px;
            border-radius: 12px;
            object-fit: contain;
            margin-left: 10px;
          }

          /* ---------------- SHARED SUMMARY CARD ----------------
             Used by BOTH containers. Keeping the visual identical,
             but they live as separate DOM nodes so the renderer can
             break pages between them independently. This is what
             fixes the "big empty space" when the category list is
             long: the balance card no longer has to jump to page 2
             with it, and the category card can break on its own. */
          .summary-card {
            background: linear-gradient(145deg, #ffffff, #f8fafc);
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            page-break-inside: avoid;
          }
          .summary-title {
            font-size: 18px;
            font-weight: bold;
            color: #0f172a;
            margin-top: 0;
            margin-bottom: 15px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 12px;
          }

          /* Balance grid inside the first summary-card */
          .balance-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .balance-card {
            background-color: #ffffff;
            padding: 18px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            text-align: center;
          }
          .balance-label {
            display: block;
            font-size: 14px;
            color: #64748b;
            margin-bottom: 8px;
          }
          .balance-value { font-size: 24px; font-weight: bold; }
          .cash { color: #059669; }
          .bank { color: #2563eb; }

          /* Category table inside the second summary-card */
          .category-summary table {
            width: 100%;
            border-collapse: collapse;
          }
          .category-summary th {
            background-color: #f1f5f9;
            font-weight: bold;
            color: #334155;
          }
          .category-summary td, .category-summary th {
            padding: 8px;
            border: 1px solid #cbd5e1;
          }
          .category-summary .total-row {
            background-color: #f8fafc;
            font-weight: bold;
          }
          .category-summary .total-row td {
            border-top: 2px solid #1e293b;
          }

          /* ---------------- TRANSACTIONS ---------------- */
          h2 { color: #1e293b; font-size: 20px; margin-bottom: 15px;}
          table.transactions { width: 100%; border-collapse: collapse; table-layout: fixed; }
          table.transactions th, table.transactions td { border: 1px solid #cbd5e1; padding: 12px; text-align: right; word-wrap: break-word; overflow: hidden; }
          table.transactions th { background-color: #f1f5f9; font-weight: bold; color: #334155;}
          table.transactions th:nth-child(1), table.transactions td:nth-child(1) { width: 13%; }
          table.transactions th:nth-child(2), table.transactions td:nth-child(2) { width: 20%; }
          table.transactions th:nth-child(3), table.transactions td:nth-child(3) { width: 8%; }
          table.transactions th:nth-child(4), table.transactions td:nth-child(4) { width: 43%; }
          table.transactions th:nth-child(5), table.transactions td:nth-child(5) { width: 15%; text-align: left; }

          .type-expense  { background-color: transparent; }
          .type-income   { background-color: #f0fff0; }
          .type-bill     { background-color: #f0f0f0; }
          .type-payroll  { background-color: #fdf5e6; }
          .type-transfer { background-color: #f0f8ff; }

          .amount-out { color: #ef4444; direction: ltr; display: block; text-align: left; font-weight: 500; }
          .amount-in { color: #10b981; direction: ltr; display: block; text-align: left; font-weight: 500;}

          .transactions-section {
            page-break-before: always;
          }

          /* ---- Mobile-specific overrides ---- */
          ${sizeOverrides}
        </style>
      </head>
      <body class="${isMobile ? "report-mobile" : "report-a4"}">
        <div class="header-container">
          <img src="${logoUri}" class="logo" alt="App Logo" />
          <div class="header-info">
            <h1>التقرير المالي: ${project.name}</h1>
            <div class="header-meta">
              <span><strong>الفترة:</strong> ${periodLabel}</span>
              <span><strong>تاريخ الإصدار:</strong> ${todayDate}</span>
            </div>
          </div>
        </div>

        <!-- ========== CONTAINER 1: BALANCES ========== -->
        <div class="summary-card">
          <h2 class="summary-title">ملخص الأرصدة والمعاملات</h2>
          <div class="balance-grid">
            <div class="balance-card">
              <span class="balance-label">النقد الفعلي المتاح</span>
              <span class="balance-value cash">${formatCurrency(project.currentCash)}</span>
            </div>
            <div class="balance-card">
              <span class="balance-label">رصيد الحساب البنكي</span>
              <span class="balance-value bank">${formatCurrency(project.currentBank)}</span>
            </div>
          </div>
        </div>

        <!-- ========== CONTAINER 2: CATEGORY SUMMARY ========== -->
        <div class="summary-card category-summary">
          <h2 class="summary-title">ملخص المعاملات حسب الفئة</h2>
          <table>
            <thead>
              <tr>
                <th style="text-align:right;">الفئة</th>
                <th style="text-align:left;">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              ${categoryRows}
              <tr class="total-row">
                <td style="text-align:right;">إجمالي الإيرادات</td>
                <td style="text-align:left; color:#10b981;">${formatCurrency(totalIncome)}</td>
              </tr>
              <tr class="total-row">
                <td style="text-align:right;">إجمالي المصروفات (غير الدخل)</td>
                <td style="text-align:left; color:#ef4444;">${formatCurrency(totalExpenses)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ========== TRANSACTIONS LOG ========== -->
        <div class="transactions-section">
          <h2>سجل المعاملات (${projectTransactions.length})</h2>
          <table class="transactions">
            <tr>
              <th>التاريخ</th>
              <th>النوع</th>
              <th>الدفع</th>
              <th>الوصف</th>
              <th>المبلغ</th>
            </tr>
            ${projectTransactions
              .map(
                (t) => `
              <tr class="type-${t.type.toLowerCase()}">
                <td>${new Date(t.date).toLocaleDateString("ar-EG")}</td>
                <td>${getTypeLabel(t.type)}</td>
                <td>${t.method === "CASH" ? "نقدي" : "بنكي"}</td>
                <td>${t.description} ${t.vendorId ? `(${t.vendorId})` : ""}</td>
                <td>
                  <span class="${isInflowType(t.type) ? "amount-in" : "amount-out"}">
                    ${isInflowType(t.type) ? "+" : "-"}${formatCurrency(t.amount)}
                  </span>
                </td>
              </tr>
            `,
              )
              .join("")}
          </table>
        </div>
      </body>
    </html>
  `;
};
