// ------------------------------------------------------------------
// FINANCIAL REPORT
// ------------------------------------------------------------------

import { LoanPerson, Project, Transaction } from "@/types";
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

const escapeHtml = (value: string | undefined | null) => {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// ------------------------------------------------------------------
// Loan aggregation
// ------------------------------------------------------------------

type LoanRow = {
  key: string;
  name: string;
  phone?: string;
  given: number;
  received: number;
};

function aggregateLoans(
  project: Project,
  projectTransactions: Transaction[],
): { rows: LoanRow[]; totalGiven: number; totalReceived: number } {
  const byKey = new Map<string, LoanRow>();

  const getPersonKey = (person: LoanPerson | undefined): string | null => {
    if (!person) return null;
    const trimmedName = person.name?.trim();
    if (person.id) return person.id;
    if (!trimmedName) return null;
    return `name:${trimmedName.toLowerCase()}`;
  };

  projectTransactions.forEach((t) => {
    const def = project.transactionTypes.find((d) => d.id === t.type);
    if (!def) return;

    const isGiven = !!def.countsAsLoanGiven;
    const isReceived = !!def.countsAsLoanReceived;
    if (!isGiven && !isReceived) return;

    const personKey = getPersonKey(t.person);
    if (!personKey) return;

    const existing = byKey.get(personKey) ?? {
      key: personKey,
      name: t.person?.name?.trim() || "بدون اسم",
      phone: t.person?.phone,
      given: 0,
      received: 0,
    };

    if (isGiven) existing.given += t.amount;
    if (isReceived) existing.received += t.amount;

    if (t.person?.phone) existing.phone = t.person.phone;
    if (t.person?.name?.trim()) existing.name = t.person.name.trim();

    byKey.set(personKey, existing);
  });

  const rows = Array.from(byKey.values()).sort(
    (a, b) => b.given + b.received - (a.given + a.received),
  );

  const totalGiven = rows.reduce((sum, r) => sum + r.given, 0);
  const totalReceived = rows.reduce((sum, r) => sum + r.received, 0);

  return { rows, totalGiven, totalReceived };
}

// ------------------------------------------------------------------
// Report HTML
// ------------------------------------------------------------------

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

  const findDef = (typeId: string) =>
    project.transactionTypes.find((d) => d.id === typeId);

  const getTypeLabel = (typeId: string) => findDef(typeId)?.label ?? typeId;

  const getTypeColor = (typeId: string) => findDef(typeId)?.color ?? "#334155";

  const isInflowType = (typeId: string) =>
    findDef(typeId)?.direction === "INFLOW";

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

  let totalIncome = 0;
  let totalExpenses = 0;
  projectTransactions.forEach((t) => {
    const def = findDef(t.type);
    if (!def || !def.affectsBalance) return;
    if (def.id === "TRANSFER") return;
    if (def.direction === "INFLOW") totalIncome += t.amount;
    else if (def.direction === "OUTFLOW") totalExpenses += t.amount;
  });

  const {
    rows: loanRows,
    totalGiven,
    totalReceived,
  } = aggregateLoans(project, projectTransactions);

  const totalNet = totalReceived - totalGiven;

  const loansRowsHtml = loanRows
    .map((r) => {
      const balance = r.received - r.given;
      const balanceClass = balance >= 0 ? "loan-amount-in" : "loan-amount-out";
      const balanceSign = balance >= 0 ? "+" : "-";
      return `
        <tr>
          <td class="loans-col-name">${escapeHtml(r.name)}</td>
          <td class="loans-col-phone">${escapeHtml(r.phone ?? "-")}</td>
          <td class="loans-col-num loan-received">${formatCurrency(r.received)}</td>
          <td class="loans-col-num loan-given">${formatCurrency(r.given)}</td>
          <td class="loans-col-num ${balanceClass}">
            ${balanceSign}${formatCurrency(Math.abs(balance))}
          </td>
        </tr>
      `;
    })
    .join("");

  const todayDate = new Date().toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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

  const pageRules = isMobile
    ? `
        @page {
          size: 340pt 600pt;
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

  // ---- Mobile size overrides ----
  const sizeOverrides = isMobile
    ? `
        body { font-size: 13px; }

        .header-container {
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .header-info h1 { font-size: 20px; margin-bottom: 6px; }
        .header-meta { gap: 6px; font-size: 11px; flex-direction: column; align-items: flex-start; }
        .header-meta span { padding: 3px 8px; }
        .logo { width: 70px; height: 70px; border-radius: 8px; margin-left: 6px; }

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

        /* Stack the balance cards and loan total cards vertically */
        .balance-grid {
          grid-template-columns: minmax(0, 1fr);
          gap: 8px;
        }
        .loans-totals-grid {
          grid-template-columns: minmax(0, 1fr);
          gap: 8px;
        }
        .balance-card, .loans-total-card { padding: 10px; }
        .balance-label, .loans-total-label { font-size: 12px; margin-bottom: 4px; }
        .balance-value { font-size: 19px; }
        .loans-total-value { font-size: 17px; }

        .category-summary td, .category-summary th { padding: 6px; font-size: 11px; }

        .loans-table td, .loans-table th { padding: 5px 6px; font-size: 10.5px; }
        .loans-table th:nth-child(2),
        .loans-table td:nth-child(2) { display: none; }
        .loans-col-num { font-size: 10.5px !important; }

        h2 { font-size: 15px; margin-bottom: 10px; }

        /* Transactions table on mobile: still horizontally
           scrollable (via .table-scroll) but with a tighter
           floor width so a bit more of the table is visible
           before the user needs to swipe. */
        .table-scroll { padding-bottom: 6px; }
        table.transactions { min-width: 560px; }
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
          /* ---- Global box-sizing reset ----
             Without this, .summary-card's padding + the inner grid's
             100% width can sum to more than the page width, which
             pushes the last card past the right edge and forces a
             horizontal scrollbar in the WebView. */
          *, *::before, *::after { box-sizing: border-box; }

          ${pageRules}

          html, body {
            /* Hard-stop any accidental horizontal overflow. The layout
               below is designed to fit; anything that would leak past
               100% is clipped instead of causing a scrollbar.
               NOTE: the transactions table has its own horizontal
               scroll container (.table-scroll), so it is not affected
               by this page-level overflow rule. */
            overflow-x: hidden;
            max-width: 100%;
          }

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
            max-width: 100%;
          }
          .header-info {
            text-align: left;
            min-width: 0;
          }
          .header-info h1 {
            margin: 0 0 10px 0;
            color: #0f172a;
            font-size: 26px;
            overflow-wrap: anywhere;
          }
          .header-meta {
            display: flex;
            gap: 15px;
            font-size: 13px;
            color: #64748b;
            flex-direction: row-reverse;
            flex-wrap: wrap;
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
            flex-shrink: 0;
          }

          /* ---------------- SHARED SUMMARY CARD ---------------- */
          .summary-card {
            background: linear-gradient(145deg, #ffffff, #f8fafc);
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            page-break-inside: avoid;
            max-width: 100%;
            overflow: hidden;
          }
          .summary-title {
            font-size: 18px;
            font-weight: bold;
            color: #0f172a;
            margin-top: 0;
            margin-bottom: 15px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 12px;
            overflow-wrap: anywhere;
          }

          .balance-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 20px;
            max-width: 100%;
          }
          .balance-card {
            background-color: #ffffff;
            padding: 18px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            text-align: center;
            min-width: 0;
            overflow-wrap: anywhere;
          }
          .balance-label {
            display: block;
            font-size: 14px;
            color: #64748b;
            margin-bottom: 8px;
          }
          .balance-value {
            font-size: 24px;
            font-weight: bold;
            display: block;
            overflow-wrap: anywhere;
          }
          .cash { color: #059669; }
          .bank { color: #2563eb; }

          .loans-totals-grid {
            display: grid;
            grid-template-columns:
              minmax(0, 1fr)
              minmax(0, 1fr)
              minmax(0, 1fr);
            gap: 12px;
            margin-bottom: 14px;
            max-width: 100%;
          }
          .loans-total-card {
            background-color: #ffffff;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            text-align: center;
            min-width: 0;
            overflow-wrap: anywhere;
          }
          .loans-total-label {
            display: block;
            font-size: 12px;
            color: #64748b;
            margin-bottom: 4px;
            overflow-wrap: anywhere;
          }
          .loans-total-value {
            font-size: 18px;
            font-weight: bold;
            display: block;
            overflow-wrap: anywhere;
          }
          .loans-total-value.given { color: #ef4444; }
          .loans-total-value.received { color: #10b981; }
          .loans-total-value.net-positive { color: #8B5CF6; }
          .loans-total-value.net-negative { color: #dc2626; }

          /* ---------- Loans table ---------- */
          .loans-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            max-width: 100%;
          }
          .loans-table th {
            background-color: #f1f5f9;
            font-weight: bold;
            color: #334155;
            font-size: 12px;
            padding: 8px;
            border: 1px solid #cbd5e1;
            overflow-wrap: anywhere;
          }
          .loans-table td {
            padding: 8px;
            border: 1px solid #cbd5e1;
            font-size: 12px;
            line-height: 1.35;
            vertical-align: middle;
            overflow-wrap: anywhere;
          }

          .loans-col-name {
            text-align: right;
            width: 30%;
          }
          .loans-col-phone {
            text-align: right;
            direction: ltr;
            color: #475569;
            width: 22%;
            font-size: 11px;
          }
          .loans-col-num {
            text-align: left;
            width: 16%;
            font-size: 12px;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
            display: table-cell;
          }
          .loan-received { color: #10b981; }
          .loan-given    { color: #ef4444; }

          .loans-col-num.loan-amount-in,
          .loans-col-num.loan-amount-out {
            font-size: 12px;
            font-weight: 700;
          }
          .loan-amount-in  { color: #8B5CF6; }
          .loan-amount-out { color: #dc2626; }

          .loans-empty {
            text-align: center;
            color: #94a3b8;
            font-style: italic;
            padding: 10px;
          }

          /* ---------------- CATEGORY SUMMARY ---------------- */
          .category-summary table {
            width: 100%;
            border-collapse: collapse;
            max-width: 100%;
          }
          .category-summary th {
            background-color: #f1f5f9;
            font-weight: bold;
            color: #334155;
          }
          .category-summary td, .category-summary th {
            padding: 8px;
            border: 1px solid #cbd5e1;
            overflow-wrap: anywhere;
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

          /* Wrapper that becomes horizontally scrollable when the
             5-column transactions table is wider than the page.
             Horizontal swipe is contained here so the rest of the
             report stays static. Everything else on the page keeps
             its normal width. */
          .table-scroll {
            width: 100%;
            max-width: 100%;
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-x: contain;
          }

          /* Give the table a floor width so it never crushes below
             legibility. When the WebView is wider (A4), the table
             just fills 100% and no scrollbar appears. When narrower
             (phone preview), the wrapper above scrolls horizontally. */
          table.transactions {
            width: 100%;
            min-width: 640px;
            max-width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          table.transactions th, table.transactions td {
            border: 1px solid #cbd5e1;
            padding: 12px;
            text-align: right;
            word-wrap: break-word;
            overflow: hidden;
          }
          table.transactions th {
            background-color: #f1f5f9;
            font-weight: bold;
            color: #334155;
          }
          table.transactions th:nth-child(1), table.transactions td:nth-child(1) { width: 16%; }
          table.transactions th:nth-child(2), table.transactions td:nth-child(2) { width: 20%; }
          table.transactions th:nth-child(3), table.transactions td:nth-child(3) { width: 11%; }
          table.transactions th:nth-child(4), table.transactions td:nth-child(4) { width: 37%; }
          table.transactions th:nth-child(5), table.transactions td:nth-child(5) { width: 15%; text-align: left; }

          .type-expense  { background-color: transparent; }
          .type-income   { background-color: #f0fff0; }
          .type-bill     { background-color: #f0f0f0; }
          .type-payroll  { background-color: #fdf5e6; }
          .type-transfer { background-color: #f0f8ff; }

          .amount-out { color: #ef4444; direction: ltr; display: block; text-align: left; font-weight: 600; }
          .amount-in  { color: #10b981; direction: ltr; display: block; text-align: left; font-weight: 600; }

          .transactions-section {
            page-break-before: always;
          }

          ${sizeOverrides}
        </style>
      </head>
      <body class="${isMobile ? "report-mobile" : "report-a4"}">
        <div class="header-container">
          <img src="${logoUri}" class="logo" alt="App Logo" />
          <div class="header-info">
            <h1>التقرير المالي: ${escapeHtml(project.name)}</h1>
            <div class="header-meta">
              <span><strong>الفترة:</strong> ${escapeHtml(periodLabel)}</span>
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

        <!-- ========== CONTAINER 2: LOANS ========== -->
        <div class="summary-card loans-summary">
          <h2 class="summary-title">ملخص القروض</h2>

          <div class="loans-totals-grid">
            <div class="loans-total-card">
              <span class="loans-total-label">إجمالي القروض المُعطاة</span>
              <span class="loans-total-value given">${formatCurrency(totalGiven)}</span>
            </div>
            <div class="loans-total-card">
              <span class="loans-total-label">إجمالي القروض المأخوذة</span>
              <span class="loans-total-value received">${formatCurrency(totalReceived)}</span>
            </div>
            <div class="loans-total-card">
              <span class="loans-total-label">صافي القروض</span>
              <span class="loans-total-value ${
                totalNet >= 0 ? "net-positive" : "net-negative"
              }">
                ${totalNet >= 0 ? "+" : "-"}${formatCurrency(Math.abs(totalNet))}
              </span>
            </div>
          </div>

          ${
            loanRows.length > 0
              ? `
            <table class="loans-table">
              <thead>
                <tr>
                  <th class="loans-col-name">الشخص</th>
                  <th class="loans-col-phone">الهاتف</th>
                  <th class="loans-col-num" style="text-align:left;">مأخوذ منه</th>
                  <th class="loans-col-num" style="text-align:left;">مُعطى له</th>
                  <th class="loans-col-num" style="text-align:left;">الرصيد</th>
                </tr>
              </thead>
              <tbody>
                ${loansRowsHtml}
              </tbody>
            </table>
          `
              : `<div class="loans-empty">لا توجد قروض مرتبطة بأشخاص في هذه الفترة</div>`
          }
        </div>

        <!-- ========== CONTAINER 3: CATEGORY SUMMARY ========== -->
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

          <!-- Only this table is horizontally scrollable. -->
          <div class="table-scroll">
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
  <td>${escapeHtml(getTypeLabel(t.type))}</td>
  <td>${t.method === "CASH" ? "نقدي" : "بنكي"}</td>
  <td>
    ${escapeHtml(t.description)}${
      t.person
        ? ` — ${escapeHtml(t.person.name)}${
            t.person.phone ? ` (${escapeHtml(t.person.phone)})` : ""
          }`
        : ""
    }${t.vendorId ? ` (${escapeHtml(t.vendorId)})` : ""}
  </td>
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
        </div>
      </body>
    </html>
  `;
};
