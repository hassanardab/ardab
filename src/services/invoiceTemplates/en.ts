/**
 * Spare Parts invoice HTML template.
 *
 * Redesigned to feature a highly professional, structured header section
 * optimized for A4 printing, utilizing clear containment boxes and typography.
 */

import { formatPhoneNumber } from "../../utils/format";

export const getEnglishInvoiceHtml = (
  invoice: any,
  logoDataUri: string,
  formatMoney: (val: number) => string,
  escapeHtml: (val: string | undefined | null) => string,
  dateStr: string,
  generatedDate: string,
  subtotal: number,
  taxAmount: number,
  discountAmount: number,
  total: number,
) => {
  const timeStr = new Date().toLocaleTimeString("en-US", {
    hour12: true,
    hour: "numeric",
    minute: "2-digit",
  });

  // Build rows directly from invoice.items
  const itemsRows = invoice.items
    .map(
      (item: any, index: number) => `
        <tr>
          <td class="col-qty">${index + 1}</td>
          <td class="col-desc">${escapeHtml(item.item)}</td>
          <td class="col-source">${escapeHtml(item.description) || "-"}</td>
          <td class="col-list">${item.quantity}</td>
          <td class="col-net">${formatMoney(item.price)}</td>
          <td class="col-amount">${formatMoney(item.quantity * item.price)}</td>
        </tr>
      `,
    )
    .join("");

  const formattedCustomerPhone = formatPhoneNumber(invoice.phoneNumber || "");
  const formattedCompanyPhone = invoice.companyPhone
    ? formatPhoneNumber(invoice.companyPhone)
    : "";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          @page {
            size: A4;
            margin: 6mm;
            @bottom-center {
              content: "Page " counter(page);
              font-size: 9px;
              color: #555;
            }
          }
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #000000;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
          }
          .invoice-container { width: 100%; max-width: 100%; margin: 0 auto; }

          /* =========================================
             UPPER SECTION - PROFESSIONAL REDESIGN
          ========================================== */
          
          .top-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 15px;
            border-bottom: 2px solid #222;
            margin-bottom: 15px;
          }

          .company-brand {
            display: flex;
            align-items: center;
            gap: 12px;
            width: 60%;
          }

          .company-logo-container {
            flex-shrink: 0;
            display: flex;
          }
          .company-logo { 
            max-width: 130px; 
            max-height: 75px; 
            object-fit: contain; 
          }

          .company-details {
            line-height: 1.4;
            color: #333;
          }
          .company-name {
            font-size: 16px;
            font-weight: 900;
            color: #000;
            text-transform: uppercase;
            margin-bottom: 2px;
            letter-spacing: 0.5px;
          }
          .company-details .company-address,
          .company-details .company-phone {
            font-size: 10px;
            color: #555;
          }

          .invoice-meta {
            width: 35%;
            text-align: right;
          }
          .invoice-title {
            font-size: 26px;
            font-weight: 900;
            color: #000;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 8px;
          }
          
          .meta-grid {
            display: grid;
            grid-template-columns: auto auto;
            row-gap: 4px;
            column-gap: 15px;
            justify-content: end;
            font-size: 10px;
          }
          .meta-label {
            color: #666;
            font-weight: bold;
            text-transform: uppercase;
          }
          .meta-value {
            color: #000;
            font-weight: bold;
          }

          /* Panels */
          .panels-wrapper {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 25px;
          }
          .panel {
            flex: 1;
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          .panel-header {
            background-color: #f4f5f7;
            border-bottom: 1px solid #ddd;
            padding: 6px 10px;
            font-size: 9px;
            font-weight: bold;
            color: #555;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .panel-body {
            padding: 10px;
            font-size: 10px;
            line-height: 1.5;
            color: #222;
            flex-grow: 1;
          }
          .customer-name {
            font-size: 11px;
            font-weight: bold;
            color: #000;
            margin-bottom: 4px;
          }
          
          .order-details-grid {
            display: grid;
            grid-template-columns: auto 1fr;
            row-gap: 6px;
            column-gap: 10px;
          }
          .od-label {
            font-weight: bold;
            color: #555;
          }
          .od-value {
            color: #000;
            text-align: left;
          }

          /* Parts Table - INCREASED ROW HEIGHT + ALIGNMENT FIXES */
          .parts-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-bottom: 5px;
          }
          .parts-table th {
            background: #222;
            color: #fff;
            border: 1px solid #222;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            font-weight: bold;
            padding: 10px 8px;
            /* text-align: left;  REMOVED to allow class-specific alignment */
            text-transform: uppercase;
          }
          .parts-table td {
            border-bottom: 1px solid #eee;
            border-left: 1px solid #eee;
            border-right: 1px solid #eee;
            padding: 10px 8px;
            font-size: 11px;
            vertical-align: middle;
          }

          /* Column alignments – apply to both th and td */
          .col-qty { width: 5%; text-align: center; }
          .col-desc { width: 22%; text-align: left; font-weight: bold; }
          .col-source { width: 37%; text-align: left; color: #444; }
          .col-list { width: 12%; text-align: center; }
          .col-net { width: 12%; text-align: center; }
          .col-amount { width: 12%; text-align: right; font-weight: bold; }

          .bottom-container {
            display: flex;
            justify-content: space-between;
            width: 100%;
            page-break-inside: avoid;
            margin-top: 20px;
          }
          .bottom-left-cell { width: 55%; padding-right: 30px; }
          .bottom-right-cell { width: 40%; }
          .warning-banner {
            background-color: #f9f9f9;
            border-left: 3px solid #222;
            padding: 8px;
            font-size: 8px;
            font-weight: bold;
            text-transform: uppercase;
            color: #333;
            margin-bottom: 25px;
          }

          .summary-table {
            width: 100%;
            border-collapse: collapse;
          }
          .summary-table td {
            padding: 6px 8px;
            font-size: 10px;
            text-transform: uppercase;
            border-bottom: 1px solid #eee;
          }
          .summary-table td.val-col {
            text-align: right;
            font-size: 11px;
            font-weight: bold;
          }
          .total-row td {
            border-top: 2px solid #222;
            border-bottom: none;
            font-weight: 900;
            font-size: 14px;
            color: #000;
            padding-top: 10px;
          }
          .signature-area {
            padding-top: 15px;
            border-top: 1px dashed #ccc;
            font-size: 10px;
            color: #555;
            width: 80%;
          }
        </style>
      </head>

      <body>
        <div class="invoice-container">

          <!-- TOP HEADER SECTION -->
          <div class="top-header">
            <div class="company-brand">
              ${
                logoDataUri
                  ? `<div class="company-logo-container">
                       <img src="${logoDataUri}" class="company-logo" alt="Company Logo" />
                     </div>`
                  : ""
              }
              <div class="company-details">
                <div class="company-name">${escapeHtml(invoice.companyName)}</div>
                <div>Spare Parts Department & Services</div>
                ${invoice.companyAddress ? `<div class="company-address">${escapeHtml(invoice.companyAddress)}</div>` : ""}
                ${formattedCompanyPhone ? `<div class="company-phone">Phone: ${formattedCompanyPhone}</div>` : ""}
              </div>
            </div>

            <div class="invoice-meta">
              <div class="invoice-title">Invoice</div>
              <div class="meta-grid">
             <div class="meta-label">Invoice #</div>
             <div class="meta-value">${invoice.invoiceNumber ? escapeHtml(invoice.invoiceNumber) : "-"}</div>
                
                <div class="meta-label">Date</div>
                <div class="meta-value">${dateStr}</div>
                
                <div class="meta-label">Time</div>
                <div class="meta-value">10:00 AM</div>

               <div class="meta-label">Paid Amount</div>
               <div class="meta-value">${formatMoney(invoice.paidAmount || 0)}</div>
              </div>
            </div>
          </div>

          <!-- ADDRESS & DETAILS PANELS -->
          <div class="panels-wrapper">
            <!-- Billing Box -->
            <div class="panel">
              <div class="panel-header">Bill To</div>
              <div class="panel-body">
                <div class="customer-name">${escapeHtml(invoice.customerName)}</div>
                <div>${formattedCustomerPhone}</div>
                <div style="margin-top: 4px; color: #555;">
                  ${escapeHtml(invoice.address || "Address Not Provided")}
                </div>
              </div>
            </div>

        

            <!-- Order Details Box -->
            <div class="panel">
              <div class="panel-header">Invoice Details</div>
              <div class="panel-body order-details-grid">
                <div class="od-label">Sale Type:</div>
                <div class="od-value">Sales</div>
                
                <div class="od-label">PO No:</div>
                <div class="od-value">-</div>
                
                <div class="od-label">Sales Rep:</div>
                <div class="od-value">SYSTEM</div>
                
                <div class="od-label">Terms:</div>
                <div class="od-value">Due on Receipt</div>
                
                <div class="od-label">Payment:</div>
                <div class="od-value">Cash</div>
              </div>
            </div>
          </div>

          <!-- PARTS TABLE -->
          <table class="parts-table">
            <thead>
              <tr>
                <th class="col-qty">#</th>
                <th class="col-desc">Part</th>
                <th class="col-source">Description</th>
                <th class="col-list">Qty</th>
                <th class="col-net">Unit Price</th>
                <th class="col-amount">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <!-- BOTTOM SECTION -->
          <div class="bottom-container">
            <div class="bottom-left-cell">
            
              <div class="signature-area">
                Authorized Signature & Date
              </div>
            </div>
            
            <div class="bottom-right-cell">
              <table class="summary-table">
                <tr>
                  <td>Subtotal</td>
                  <td class="val-col">${formatMoney(subtotal)}</td>
                </tr>
                <tr>
                  <td>Sales Tax ${invoice.tax > 0 ? `(${invoice.tax}%)` : ""}</td>
                  <td class="val-col">${formatMoney(taxAmount)}</td>
                </tr>
                ${
                  invoice.discount > 0
                    ? `<tr>
                         <td>Discount (${invoice.discount}%)</td>
                         <td class="val-col">-${formatMoney(discountAmount)}</td>
                       </tr>`
                    : ""
                }
              <tr class="total-row">
  <td>Total</td>
  <td class="val-col">${formatMoney(total)}</td>
</tr>
${
  (invoice.paidAmount || 0) > 0
    ? `
  <tr>
    <td>Paid Amount</td>
    <td class="val-col">${formatMoney(invoice.paidAmount)}</td>
  </tr>
  <tr>
    <td>Balance Due</td>
    <td class="val-col">${formatMoney(total - invoice.paidAmount)}</td>
  </tr>
  `
    : ""
}
              </table>
            </div>
          </div>

        </div>
      </body>
    </html>
  `;
};
