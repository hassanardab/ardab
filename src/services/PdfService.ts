import { formatCurrency } from "@/utils/format";
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

  return `
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; direction: rtl; text-align: right; }
          h1 { text-align: center; color: #1a365d; }
          .summary-box { background-color: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
          .balance { font-size: 18px; font-weight: bold; margin: 5px 0; }
          .cash { color: #047857; }
          .bank { color: #1d4ed8; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: right; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .amount-out { color: #ef4444; direction: ltr; display: inline-block; }
          .amount-in { color: #10b981; direction: ltr; display: inline-block; }
        </style>
      </head>
      <body>
        <h1>التقرير المالي: ${project.name}</h1>
        <div class="summary-box">
          <h2>مراجعة الأرصدة</h2>
          <p class="balance cash">النقد الفعلي المتاح: $${formatCurrency(project.currentCash)}</p>
          <p class="balance bank">رصيد الحساب البنكي: $${formatCurrency(project.currentBank)}</p>
          <p style="margin-top: 10px;"><strong>إجمالي المصروفات: $${formatCurrency(totalExpenses)}</strong></p>
        </div>
        <h2>سجل المعاملات</h2>
        <table>
          <tr><th>التاريخ</th><th>النوع</th><th>الطريقة</th><th>الوصف</th><th>المبلغ</th></tr>
          ${projectTransactions
            .map(
              (t) => `
            <tr>
              <td>${new Date(t.date).toLocaleDateString("ar-EG")}</td>
              <td>${t.type === "INCOME" ? "دخل" : t.type === "EXPENSE" ? "مصروف" : t.type === "PAYROLL" ? "رواتب" : "فاتورة"}</td>
              <td>${t.method === "CASH" ? "نقدي" : "بنكي"}</td>
              <td>${t.description} ${t.vendorName ? `(${t.vendorName})` : ""}</td>
              <td class="${t.type === "INCOME" ? "amount-in" : "amount-out"}">
                ${t.type === "INCOME" ? "+" : "-"}$${formatCurrency(t.amount)}
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

export const exportPdf = async (html: string) => {
  try {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
  } catch (error) {
    console.error("Error exporting PDF:", error);
  }
};

export const generateFinancialReport = async (
  project: Project,
  transactions: Transaction[],
) => {
  const projectTransactions = transactions.filter(
    (t) => t.projectId === project.id,
  );

  const totalExpenses = projectTransactions
    .filter((t) => t.type !== "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);

  const html = `
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; direction: rtl; text-align: right; }
          h1 { text-align: center; color: #1a365d; }
          .summary-box { background-color: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
          .balance { font-size: 18px; font-weight: bold; margin: 5px 0; }
          .cash { color: #047857; }
          .bank { color: #1d4ed8; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: right; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .amount-out { color: #ef4444; direction: ltr; display: inline-block; }
          .amount-in { color: #10b981; direction: ltr; display: inline-block; }
        </style>
      </head>
      <body>
        <h1>التقرير المالي: ${project.name}</h1>
        
        <div class="summary-box">
          <h2>مراجعة الأرصدة</h2>
          <p>يرجى التحقق من هذه المبالغ فعلياً:</p>
          <p class="balance cash">النقد الفعلي المتاح: $${project.currentCash.toFixed(2)}</p>
          <p class="balance bank">رصيد الحساب البنكي: $${project.currentBank.toFixed(2)}</p>
          <p style="margin-top: 10px;"><strong>إجمالي المصروفات: $${totalExpenses.toFixed(2)}</strong></p>
        </div>

        <h2>سجل المعاملات</h2>
        <table>
          <tr>
            <th>التاريخ</th>
            <th>النوع</th>
            <th>الطريقة</th>
            <th>الوصف</th>
            <th>المبلغ</th>
          </tr>
          ${projectTransactions
            .map(
              (t) => `
            <tr>
              <td>${new Date(t.date).toLocaleDateString("ar-EG")}</td>
              <td>${t.type === "INCOME" ? "دخل" : t.type === "EXPENSE" ? "مصروف" : t.type === "PAYROLL" ? "رواتب" : "فاتورة"}</td>
              <td>${t.method === "CASH" ? "نقدي" : "بنكي"}</td>
              <td>${t.description} ${t.vendorName ? `(${t.vendorName})` : ""}</td>
              <td class="${t.type === "INCOME" ? "amount-in" : "amount-out"}">
                ${t.type === "INCOME" ? "+" : "-"}$${t.amount.toFixed(2)}
              </td>
            </tr>
          `,
            )
            .join("")}
        </table>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
  } catch (error) {
    console.error("Error generating PDF:", error);
  }
};
