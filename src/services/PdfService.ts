// src/services/PdfService.ts
import { formatCurrency } from "@/utils/format";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Project, Transaction } from "../types";

export const getFinancialReportHtml = (
  project: Project,
  transactions: Transaction[],
) => {
  const projectTransactions = transactions.filter(
    (t) => t.projectId === project.id,
  );
  const totalExpenses = projectTransactions
    .filter((t) => t.type !== "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);

  // دالة مساعدة لتحويل نوع المعاملة إلى اسم عربي (للاستمرارية)
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
            color: #333; 
            direction: rtl; 
            text-align: right; 
          }
          h1 { text-align: center; color: #1a365d; }
          .summary-box { 
            background-color: #f7fafc; 
            padding: 10px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
            border: 1px solid #e2e8f0; 
            page-break-inside: avoid; 
          }
          .balance-row { display: flex; justify-content: space-between; align-items: center; margin: 10px 0; }
          .balance-row p { margin: 0; font-size: 18px; font-weight: bold; }
          .cash { color: #047857; }
          .bank { color: #1d4ed8; }
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 15px; 
            table-layout: fixed; 
          }
          th, td { 
            border: 1px solid #cbd5e1; 
            padding: 12px; 
            text-align: right; 
            word-wrap: break-word; 
            overflow: hidden; 
          }
          th { background-color: #f1f5f9; font-weight: bold; }

          /* Fixed Column Widths */
          th:nth-child(1), td:nth-child(1) { width: 18%; } /* التاريخ */
          th:nth-child(2), td:nth-child(2) { width: 14%; } /* النوع */
          th:nth-child(3), td:nth-child(3) { width: 14%; } /* الطريقة */
          th:nth-child(4), td:nth-child(4) { width: 32%; } /* الوصف */
          th:nth-child(5), td:nth-child(5) { width: 22%; text-align: left; } /* المبلغ */

         /* ألوان خلفية خفيفة جداً حسب نوع المعاملة */
          .type-expense  { background-color: transparent; }  /* بلا لون */
          .type-income   { background-color: #f0fff0; }  /* أخضر فاتح جداً */
          .type-bill     { background-color: #f0f0f0; }  /* رمادي فاتح جداً */
          .type-payroll  { background-color: #fdf5e6; }  /* بنّي فاتح */
          .type-transfer { background-color: #f0f8ff; } /* ازرق فاتح */

          .amount-out { color: #ef4444; direction: ltr; display: block; text-align: left; }
          .amount-in { color: #10b981; direction: ltr; display: block; text-align: left; }
        </style>
      </head>
      <body>
        <h1>التقرير المالي: ${project.name}</h1>
        
        <div class="summary-box">
          <h2>مراجعة الأرصدة</h2>
          <p>يرجى التحقق من هذه المبالغ فعلياً:</p>
          
          <div class="balance-row">
            <p class="cash">النقد الفعلي المتاح: ${formatCurrency(project.currentCash)}</p>
            <p class="bank">رصيد الحساب البنكي: ${formatCurrency(project.currentBank)}</p>
          </div>
          
          <p style="margin-top: 10px;"><strong>إجمالي المصروفات: ${formatCurrency(totalExpenses)}</strong></p>
        </div>

        <h2>سجل المعاملات</h2>
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
