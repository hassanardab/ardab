import { formatCurrency } from "@/utils/format";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Image } from "react-native";
import { Project, Transaction } from "../types";

// Grab the local app logo reference
const LOGO_ASSET = require("@/assets/images/icon.png");

export const getFinancialReportHtml = (
  project: Project,
  transactions: Transaction[],
  periodLabel: string = "تاريخ المشروع بالكامل", // Fallback to all-time
) => {
  // Resolve local image to a URI expo-print can load
  const logoUri = Image.resolveAssetSource(LOGO_ASSET).uri;

  const projectTransactions = transactions
    .filter((t) => t.projectId === project.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalExpenses = projectTransactions
    .filter((t) => t.type !== "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);

  // Generate today's date
  const todayDate = new Date().toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "INCOME":
        return "دخل";
      case "EXPENSE":
        return "مصروف";
      case "PAYROLL":
        return "رواتب";
      case "BILL":
        return "فاتورة";
      case "TRANSFER":
        return "تحويل";
      default:
        return type;
    }
  };

  return `
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
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
          body { 
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
            margin: 0; 
            padding: 0; 
            color: #334155; 
            direction: rtl; 
            text-align: right; 
          }
          
          /* Modern Header Layout */
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #1e293b;
            padding-bottom: 20px;
            margin-bottom: 25px;
          }
          .header-info { text-align: right; }
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

          /* Professional Balance Summary Box */
          .summary-box { 
            background: linear-gradient(145deg, #ffffff, #f8fafc);
            padding: 20px; 
            border-radius: 12px; 
            margin-bottom: 30px; 
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
          .expense-total {
            margin-top: 20px;
            text-align: center;
            padding-top: 15px;
            border-top: 1px dashed #cbd5e1;
            font-size: 16px;
            color: #334155;
          }
          
          /* Table Styles */
          h2 { color: #1e293b; font-size: 20px; margin-bottom: 15px;}
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: right; word-wrap: break-word; overflow: hidden; }
          th { background-color: #f1f5f9; font-weight: bold; color: #334155;}
          
          th:nth-child(1), td:nth-child(1) { width: 18%; }
          th:nth-child(2), td:nth-child(2) { width: 14%; }
          th:nth-child(3), td:nth-child(3) { width: 14%; }
          th:nth-child(4), td:nth-child(4) { width: 32%; }
          th:nth-child(5), td:nth-child(5) { width: 22%; text-align: left; }

          .type-expense  { background-color: transparent; }
          .type-income   { background-color: #f0fff0; }
          .type-bill     { background-color: #f0f0f0; }
          .type-payroll  { background-color: #fdf5e6; }
          .type-transfer { background-color: #f0f8ff; }

          .amount-out { color: #ef4444; direction: ltr; display: block; text-align: left; font-weight: 500; }
          .amount-in { color: #10b981; direction: ltr; display: block; text-align: left; font-weight: 500;}
        </style>
      </head>
      <body>
        
        <!-- Upgraded Header section -->
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
        
        <!-- Upgraded Summary Grid -->
        <div class="summary-box">
          <h2 class="summary-title">مراجعة الأرصدة الحالية</h2>
          
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
          
          <div class="expense-total">
            إجمالي المصروفات <strong>للفترة المحددة</strong>: <strong style="color: #ef4444">${formatCurrency(totalExpenses)}</strong>
          </div>
        </div>

        <h2>سجل المعاملات (${projectTransactions.length})</h2>
        <table>
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
              <td>${t.description} ${t.vendorName ? `(${t.vendorName})` : ""}</td>
              <td>
                <span class="${t.type === "INCOME" ? "amount-in" : "amount-out"}">
                  ${t.type === "INCOME" ? "+" : "-"}${formatCurrency(t.amount)}
                </span>
              </td>
            </tr>
          `,
            )
            .join("")}
        </table>
      </body>
    </html>
  `;
};

export const exportPdf = async (
  html: string,
  customFileName: string = "report.pdf",
) => {
  try {
    const { uri } = await Print.printToFileAsync({ html });

    // Sanitize the filename to prevent iOS/Android crashing on illegal characters
    const safeFileName = customFileName.replace(/[:/\\?%*|"<>]/g, "-");

    // Dynamically extract the writable directory provided by expo-print
    const targetDirectory = uri.substring(0, uri.lastIndexOf("/") + 1);
    const newUri = `${targetDirectory}${safeFileName}`;

    await FileSystem.copyAsync({ from: uri, to: newUri });

    await Sharing.shareAsync(newUri, {
      UTI: ".pdf",
      mimeType: "application/pdf",
    });
  } catch (error) {
    console.error("Error exporting PDF:", error);
  }
};

export const generateFinancialReport = async (
  project: Project,
  transactions: Transaction[],
) => {
  const html = getFinancialReportHtml(project, transactions);

  try {
    const { uri } = await Print.printToFileAsync({ html });

    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
    });

    const rawFileName = `التقرير المالي مشروع ${project.name}-${dateStr}.pdf`;
    const safeFileName = rawFileName.replace(/[:/\\?%*|"<>]/g, "-");

    // Dynamically extract the writable directory provided by expo-print
    const targetDirectory = uri.substring(0, uri.lastIndexOf("/") + 1);
    const newUri = `${targetDirectory}${safeFileName}`;

    await FileSystem.copyAsync({
      from: uri,
      to: newUri,
    });

    await Sharing.shareAsync(newUri, {
      UTI: ".pdf",
      mimeType: "application/pdf",
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
  }
};
