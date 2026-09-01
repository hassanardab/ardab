/**
 * Body Shop invoice HTML template.
 * Professional estimate‑style layout.
 */
export const getBodyShopInvoiceHtml = (
  invoice: any, // Invoice type from your project
  logoDataUri: string,
  formatMoney: (val: number) => string,
  escapeHtml: (val: string | undefined | null) => string,
  dateStr: string,
  generatedDate: string,
  subtotal: number,
  taxAmount: number,
  discountAmount: number,
  total: number,
  itemsRows: string,
): string => {
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          @page { size: A4; margin: 8mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #111111;
            font-size: 11px;
            background: #ffffff;
          }
          .invoice-page { width: 100%; }

          /* ---- HEADER ---- */
          .top-header {
            display: table;
            width: 100%;
            padding-bottom: 14px;
            border-bottom: 1.5px solid #222222;
            margin-bottom: 12px;
          }
          .header-left,
          .header-center,
          .header-right {
            display: table-cell;
            vertical-align: top;
          }
          .header-left { width: 30%; }
          .header-center { width: 40%; text-align: center; }
          .header-right { width: 30%; text-align: right; }

          .small-label {
            font-size: 10px;
            color: #555555;
            margin-bottom: 3px;
          }
          .customer-name {
            font-size: 13px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .company-logo {
            max-width: 65px;
            max-height: 65px;
            object-fit: contain;
            margin-bottom: 5px;
          }
          .company-name {
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 0.3px;
            margin-bottom: 4px;
          }
          .company-info {
            font-size: 10px;
            line-height: 1.45;
          }
          .invoice-id-box { text-align: left; }
          .invoice-id-label {
            font-size: 10px;
            color: #555555;
          }
          .invoice-id {
            font-size: 15px;
            font-weight: bold;
            margin-top: 2px;
          }
          .invoice-date {
            margin-top: 8px;
            font-size: 10px;
          }

          /* ---- INFORMATION SECTION ---- */
          .info-section {
            display: table;
            width: 100%;
            margin-bottom: 14px;
            border-bottom: 1px solid #222222;
            padding-bottom: 12px;
          }
          .info-column {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding-right: 20px;
          }
          .info-column:last-child {
            padding-right: 0;
            padding-left: 20px;
          }
          .info-title {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 7px;
            text-transform: uppercase;
          }
          .info-row {
            display: table;
            width: 100%;
            margin-bottom: 4px;
          }
          .info-label {
            display: table-cell;
            width: 42%;
            color: #555555;
          }
          .info-value {
            display: table-cell;
            width: 58%;
            font-weight: 500;
          }

          /* ---- ITEMS TABLE ---- */
          .section-title {
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            padding-bottom: 7px;
            border-bottom: 1px solid #222222;
            margin-bottom: 8px;
          }
          .category-title {
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 10px;
            margin-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: auto;
          }
          thead { display: table-header-group; }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          th {
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            padding: 7px 5px;
            border-bottom: 1px solid #555555;
            text-align: left;
          }
          td {
            padding: 7px 5px;
            border-bottom: 1px solid #d0d0d0;
            vertical-align: top;
          }
          .line-number {
            width: 5%;
            text-align: center;
          }
          .item-description {
            width: 34%;
          }
          .operation {
            width: 22%;
          }
          .units {
            width: 10%;
            text-align: center;
          }
          .unit-price {
            width: 14%;
            text-align: right;
            white-space: nowrap;
          }
          .total-price {
            width: 15%;
            text-align: right;
            font-weight: 500;
            white-space: nowrap;
          }
          .item-name {
            font-weight: bold;
            margin-bottom: 2px;
          }
          .item-details {
            font-size: 9px;
            color: #555555;
            line-height: 1.35;
          }

          /* ---- TOTALS ---- */
          .bottom-section {
            display: table;
            width: 100%;
            margin-top: 18px;
          }
          .notes-area {
            display: table-cell;
            width: 55%;
            vertical-align: top;
            padding-right: 20px;
          }
          .totals-area {
            display: table-cell;
            width: 45%;
            vertical-align: top;
          }
          .notes-title {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          .notes-box {
            min-height: 60px;
            border-top: 1px solid #222222;
            padding-top: 8px;
            color: #555555;
            line-height: 1.5;
          }
          .totals-table {
            width: 100%;
          }
          .totals-table td {
            padding: 7px 8px;
            border-bottom: 1px solid #d0d0d0;
          }
          .total-label {
            text-align: left;
            font-weight: 500;
          }
          .total-value {
            text-align: right;
            white-space: nowrap;
          }
          .grand-total td {
            border-top: 2px solid #111111;
            border-bottom: 2px solid #111111;
            font-size: 14px;
            font-weight: bold;
            padding-top: 10px;
            padding-bottom: 10px;
          }

          /* ---- FOOTER ---- */
          .footer {
            margin-top: 35px;
            padding-top: 8px;
            border-top: 1px solid #222222;
            display: table;
            width: 100%;
            font-size: 9px;
            color: #555555;
          }
          .footer-left {
            display: table-cell;
            text-align: left;
          }
          .footer-center {
            display: table-cell;
            text-align: center;
          }
          .footer-right {
            display: table-cell;
            text-align: right;
          }
        </style>
      </head>
      <body>
        <div class="invoice-page">
          <!-- TOP HEADER -->
          <div class="top-header">
            <div class="header-left">
              <div class="small-label">Customer</div>
              <div class="customer-name">${escapeHtml(invoice.customerName)}</div>
            </div>
            <div class="header-center">
              ${logoDataUri ? `<img src="${logoDataUri}" class="company-logo" alt="Company Logo" />` : ""}
              <div class="company-name">${escapeHtml(invoice.companyName)}</div>
              <div class="company-info">Invoice / Estimate Document</div>
            </div>
            <div class="header-right">
              <div class="invoice-id-box">
                <div class="invoice-id-label">Estimate / Invoice ID</div>
                <div class="invoice-id">${escapeHtml(invoice.id)}</div>
                <div class="invoice-date"><strong>Date:</strong> ${dateStr}</div>
              </div>
            </div>
          </div>

          <!-- INVOICE INFORMATION -->
          <div class="info-section">
            <div class="info-column">
              <div class="info-title">Customer Information</div>
              <div class="info-row">
                <div class="info-label">Customer Name</div>
                <div class="info-value">${escapeHtml(invoice.customerName)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Invoice Date</div>
                <div class="info-value">${dateStr}</div>
              </div>
            </div>
            <div class="info-column">
              <div class="info-title">Invoice Information</div>
              <div class="info-row">
                <div class="info-label">Invoice Number</div>
                <div class="info-value">${escapeHtml(invoice.id)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Generated On</div>
                <div class="info-value">${generatedDate}</div>
              </div>
            </div>
          </div>

          <!-- ITEMS -->
          <div class="section-title">Invoice Details</div>
          <div class="category-title">Items / Services</div>
          <table>
            <thead>
              <tr>
                <th class="line-number">Line #</th>
                <th class="item-description">Description</th>
                <th class="operation">Details</th>
                <th class="units">Qty</th>
                <th class="unit-price">Unit Price</th>
                <th class="total-price">Total Price</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>

          <!-- TOTALS + NOTES -->
          <div class="bottom-section">
            <div class="notes-area">
              <div class="notes-title">Notes</div>
              <div class="notes-box">
                ${invoice.discount > 0 ? `Discount applied: ${invoice.discount}%<br />` : ""}
                ${invoice.tax > 0 ? `Tax applied: ${invoice.tax}%` : ""}
              </div>
            </div>
            <div class="totals-area">
              <table class="totals-table">
                <tr>
                  <td class="total-label">Subtotal</td>
                  <td class="total-value">${formatMoney(subtotal)}</td>
                </tr>
                <tr>
                  <td class="total-label">Tax (${invoice.tax}%)</td>
                  <td class="total-value">${formatMoney(taxAmount)}</td>
                </tr>
                <tr>
                  <td class="total-label">Discount (${invoice.discount}%)</td>
                  <td class="total-value">-${formatMoney(discountAmount)}</td>
                </tr>
                <tr class="grand-total">
                  <td>TOTAL</td>
                  <td class="total-value">${formatMoney(total)}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- FOOTER -->
          <div class="footer">
            <div class="footer-left">Generated: ${generatedDate}</div>
            <div class="footer-center">${escapeHtml(invoice.companyName)}</div>
            <div class="footer-right">Invoice ID: ${escapeHtml(invoice.id)}</div>
          </div>
        </div>
      </body>
    </html>
  `;
};
