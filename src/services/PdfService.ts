import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Project, Transaction } from "../types";

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
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; color: #1a365d; }
          .summary-box { background-color: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
          .balance { font-size: 18px; font-weight: bold; margin: 5px 0; }
          .cash { color: #047857; }
          .bank { color: #1d4ed8; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .amount-out { color: #ef4444; }
          .amount-in { color: #10b981; }
        </style>
      </head>
      <body>
        <h1>Financial Report: ${project.name}</h1>
        
        <div class="summary-box">
          <h2>Reconciliation Check</h2>
          <p>Please verify these amounts physically:</p>
          <p class="balance cash">Physical Cash on Hand: $${project.currentCash.toFixed(2)}</p>
          <p class="balance bank">Bank Account Balance: $${project.currentBank.toFixed(2)}</p>
          <p style="margin-top: 10px;"><strong>Total Expenditures: $${totalExpenses.toFixed(2)}</strong></p>
        </div>

        <h2>Transaction Ledger</h2>
        <table>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Method</th>
            <th>Description</th>
            <th>Amount</th>
          </tr>
          ${projectTransactions
            .map(
              (t) => `
            <tr>
              <td>${new Date(t.date).toLocaleDateString()}</td>
              <td>${t.type}</td>
              <td>${t.method}</td>
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
