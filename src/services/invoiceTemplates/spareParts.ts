//src/services/invoiceTemplates/spareParts.ts
/**
 * Spare Parts invoice HTML template.
 *
 * Redesigned to follow the traditional automotive spare-parts
 * invoice layout shown in the attached reference image (Evans Toyota style).
 *
 * IMPORTANT:
 * This template only changes the Spare Parts invoice design.
 */
export const getSparePartsInvoiceHtml = (
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
  itemsRows: string,
): string => {
  // Extract time from generatedDate if present or fallback
  const timeStr = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <style>
          @page {
            size: A4;
            margin: 6mm 8mm;
          }

          * {
            box-sizing: border-box;
          }

          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #000000;
            font-family: "Courier New", Courier, monospace;
            font-size: 10px;
          }

          .invoice-container {
            width: 100%;
          }

          /* =========================================
             HEADER SECTION
          ========================================== */
          .company-header {
            text-align: center;
            padding-bottom: 6px;
          }

          .company-logo {
            max-width: 160px;
            max-height: 60px;
            margin: 0 auto 4px auto;
            display: block;
            object-fit: contain;
          }

          .company-name {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 20px;
            font-weight: 900;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-bottom: 2px;
          }

          .company-details {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 8.5px;
            line-height: 1.3;
            color: #000;
          }

          /* =========================================
             SOLD TO / SHIPPED TO BANNER
          ========================================== */
          .address-box {
            border: 1px solid #000;
            margin-bottom: 4px;
          }

          .address-header-bar {
            background: #000;
            color: #fff;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 8px;
            font-weight: bold;
            padding: 3px 6px;
            display: flex;
            justify-content: space-between;
          }

          .address-content {
            padding: 8px 10px;
            font-size: 11px;
            font-weight: bold;
            line-height: 1.6;
            min-height: 55px;
            text-transform: uppercase;
          }

          .address-content .customer-detail {
            font-weight: normal;
            font-size: 10px;
            color: #333;
            text-transform: none;
          }

          /* =========================================
             POLICY SECTION
          ========================================== */
          .policy-text {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 6px;
            line-height: 1.25;
            text-align: center;
            font-weight: bold;
            padding: 4px 2px;
            margin-bottom: 2px;
            text-transform: uppercase;
          }

          /* =========================================
             META DATA TABLES
          ========================================== */
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: -1px;
          }

          .meta-table td {
            border: 1px solid #000;
            padding: 0;
            vertical-align: top;
          }

          .meta-label {
            background: #000;
            color: #fff;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 7px;
            font-weight: bold;
            padding: 2px 4px;
            text-transform: uppercase;
          }

          .meta-value {
            padding: 4px 6px;
            font-size: 11px;
            font-weight: bold;
            min-height: 20px;
          }

          .meta-value .contact-info {
            font-weight: normal;
            font-size: 9px;
            color: #333;
          }

          /* =========================================
             PARTS TABLE
          ========================================== */
          .parts-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          .parts-table th {
            background: #000;
            color: #fff;
            border: 1px solid #000;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 7.5px;
            font-weight: bold;
            padding: 3px 2px;
            text-transform: uppercase;
            text-align: left;
          }

          .parts-table td {
            border-left: 1px solid #000;
            border-right: 1px solid #000;
            padding: 3px 4px;
            font-size: 10px;
            font-weight: bold;
            vertical-align: top;
            height: 22px;
          }

          .col-qty { width: 6%; text-align: center; }
          .col-desc { width: 48%; text-align: left; }
          .col-source { width: 10%; text-align: left; }
          .col-list { width: 12%; text-align: right; }
          .col-net { width: 12%; text-align: right; }
          .col-amount { width: 12%; text-align: right; }

          /* Empty fill rows to preserve full invoice table height */
          .empty-row td {
            height: 22px;
          }

          /* =========================================
             BOTTOM SECTION
          ========================================== */
          .bottom-container {
            display: table;
            width: 100%;
            border: 1px solid #000;
            page-break-inside: avoid;
          }

          .bottom-left-cell {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            border-right: 1px solid #000;
          }

          .bottom-right-cell {
            display: table-cell;
            width: 50%;
            vertical-align: top;
          }

          /* Print Date / Time header */
          .date-time-bar {
            display: table;
            width: 100%;
            border-bottom: 1px solid #000;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 8px;
            font-weight: bold;
          }

          .date-time-cell {
            display: table-cell;
            padding: 3px 5px;
          }

          .date-time-cell span {
            font-family: "Courier New", Courier, monospace;
            font-size: 10px;
            margin-left: 5px;
          }

          /* Hours section */
          .hours-box {
            text-align: center;
            padding: 6px 4px;
            font-family: Arial, Helvetica, sans-serif;
          }

          .hours-title {
            font-size: 13px;
            font-weight: bold;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
          }

          .hours-body {
            font-size: 11px;
            font-weight: 500;
            line-height: 1.35;
          }

          .thank-you-title {
            text-align: center;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 28px;
            font-weight: 900;
            margin: 4px 0;
            letter-spacing: 0.5px;
          }

          .warning-banner {
            background: #000;
            color: #fff;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 6.5px;
            font-weight: bold;
            text-align: center;
            padding: 3px 2px;
            text-transform: uppercase;
          }

          /* Summary Table */
          .summary-table {
            width: 100%;
            border-collapse: collapse;
          }

          .summary-table td {
            border-bottom: 1px solid #000;
            padding: 3px 6px;
            font-size: 9px;
            font-family: Arial, Helvetica, sans-serif;
            font-weight: bold;
            text-transform: uppercase;
            height: 22px;
          }

          .summary-table td.val-col {
            text-align: right;
            font-family: "Courier New", Courier, monospace;
            font-size: 11px;
            width: 35%;
          }

          .summary-table tr:last-child td {
            border-bottom: none;
          }

          .signature-area {
            padding: 8px 0 2px 0;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            font-weight: bold;
          }

          .copyright-footer {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 6px;
            color: #333;
            margin-top: 2px;
          }
        </style>
      </head>

      <body>
        <div class="invoice-container">

          <!-- Header -->
          <div class="company-header">
            ${
              logoDataUri
                ? `<img src="${logoDataUri}" class="company-logo" alt="Logo" />`
                : ""
            }
            <div class="company-name">${escapeHtml(invoice.companyName)}</div>
            <div class="company-details">
              SPARE PARTS DEPARTMENT & SERVICES<br />
              Phone: (260) 482-3730
            </div>
          </div>

          <!-- Sold To / Shipped To -->
          <div class="address-box">
            <div class="address-header-bar">
              <span>SOLD TO</span>
              <span>SHIPPED TO</span>
            </div>
            <div class="address-content">
              ${escapeHtml(invoice.customerName)}<br />
              <span class="customer-detail">📞 ${escapeHtml(invoice.phoneNumber || "")}</span><br />
              <span class="customer-detail">📍 ${escapeHtml(invoice.address || "")}</span>
            </div>
          </div>

          <!-- Detailed Dealership Return Policy -->
          <div class="policy-text">
            RETURN POLICY: PLEASE RETAIN YOUR COPY OF THIS INVOICE - WE CAN NOT PROCESS ANY RETURNS OR WARRANTY CLAIMS WITHOUT YOUR ORIGINAL INVOICE.<br />
            ALL ELIGIBLE RETURNS MUST BE MADE WITHIN 30 DAYS OF INVOICE DATE AND ARE SUBJECT TO A 20% HANDLING CHARGE.<br />
            ITEMS WITH AN INDIVIDUAL PRICE OF $15.00 OR LESS, ALL SALES FINAL.<br />
            THE FOLLOWING ITEMS ARE NON-RETURNABLE: SHIPPING CHARGES, ELECTRICAL PARTS, SPECIAL ORDER PARTS, PARTS IN DAMAGED OR OPEN PACKAGES, PARTS NOT IN ORIGINAL PACKAGES, PARTS WITH ALTERED OR DAMAGED PART LABELS (INCLUDING BUT NOT LIMITED TO WRITING ON THE LABEL), CORES RETURNED WITHOUT ORIGINAL PACKAGING, PARTS SOLD IN MULTIPLE QUANTITIES NOT RETURNED IN THE PACK QUANTITY (NO PARTIAL PACKS ACCEPTED FOR RETURN). WE ARE UNABLE TO PROCESS ANY CLAIMS FOR CONCEALED DAMAGE ONCE YOU ACCEPT YOUR PARTS. PLEASE INSPECT ALL PARTS BEFORE LEAVING THE STORE.
          </div>

          <!-- Invoice Primary Meta -->
          <table class="meta-table">
            <tr>
              <td style="width: 20%;">
                <div class="meta-label">CUSTOMER</div>
                <div class="meta-value" style="font-size: 10px; font-weight: bold;">
                  ${escapeHtml(invoice.customerName)}
                  <div class="contact-info">📞 ${escapeHtml(invoice.phoneNumber || "")}</div>
                  <div class="contact-info">📍 ${escapeHtml(invoice.address || "")}</div>
                </div>
              </td>
              <td style="width: 20%;">
                <div class="meta-label">PHONE</div>
                <div class="meta-value" style="font-size: 10px;">
                  ${escapeHtml(invoice.phoneNumber || "")}
                </div>
              </td>
              <td style="width: 25%;">
                <div class="meta-label">TERMS</div>
                <div class="meta-value">Payment Due Upon Receipt.</div>
              </td>
              <td style="width: 17%;">
                <div class="meta-label">INVOICE DATE</div>
                <div class="meta-value">${dateStr}</div>
              </td>
              <td style="width: 18%;">
                <div class="meta-label">INVOICE NUMBER / PG.</div>
                <div class="meta-value">${escapeHtml(invoice.id)} &nbsp;1</div>
              </td>
            </tr>
          </table>

          <!-- Invoice Secondary Meta -->
          <table class="meta-table" style="margin-bottom: 0;">
            <tr>
              <td style="width: 50%;">
                <div class="meta-label">SHIP VIA</div>
                <div class="meta-value">WILL CALL</div>
              </td>
              <td style="width: 50%;">
                <div class="meta-label">SALESPERSONS NAME</div>
                <div class="meta-value">-</div>
              </td>
            </tr>
          </table>

          <!-- Parts Table -->
          <table class="parts-table">
            <thead>
              <tr>
                <th class="col-qty">QTY.</th>
                <th class="col-desc">DESCRIPTION</th>
                <th class="col-source">SOURCE</th>
                <th class="col-list">LIST</th>
                <th class="col-net">NET</th>
                <th class="col-amount">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
              <!-- Fill remaining space with empty rows for classic grid look -->
              <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            </tbody>
          </table>

          <!-- Bottom Section -->
          <div class="bottom-container">
            <!-- Left Box -->
            <div class="bottom-left-cell">
              <div class="date-time-bar">
                <div class="date-time-cell" style="border-right: 1px solid #000; width: 50%;">
                  DATE PRINTED <span>${generatedDate}</span>
                </div>
                <div class="date-time-cell" style="width: 50%;">
                  TIME <span>${timeStr}</span>
                </div>
              </div>

              <div class="hours-box">
                <div class="hours-title">PARTS DEPARTMENT HOURS</div>
                <div class="hours-body">
                  7:30 a.m. to 6:00 p.m. Mon - Fri<br />
                  8:00 a.m. to 5:00 p.m. Sat
                </div>
              </div>

              <div class="thank-you-title">Thank You!</div>

              <div class="warning-banner">
                NO RETURN ON ELECTRICAL OR SAFETY ITEMS OR SPECIAL ORDERS.
              </div>
            </div>

            <!-- Right Box / Summary -->
            <div class="bottom-right-cell">
              <table class="summary-table">
                <tr>
                  <td>SERVICES OR EQUIPMENT</td>
                  <td class="val-col">${formatMoney(subtotal)}</td>
                </tr>
                <tr>
                  <td>SHIPPING</td>
                  <td class="val-col"></td>
                </tr>
                <tr>
                  <td>C.O.D. CHARGE</td>
                  <td class="val-col"></td>
                </tr>
                <tr>
                  <td>SALES TAX OR TAX I.D. ${invoice.tax > 0 ? `(${invoice.tax}%)` : "XXXFILE"}</td>
                  <td class="val-col">${formatMoney(taxAmount)}</td>
                </tr>
                ${
                  invoice.discount > 0
                    ? `<tr>
                        <td>DISCOUNT (${invoice.discount}%)</td>
                        <td class="val-col">-${formatMoney(discountAmount)}</td>
                       </tr>`
                    : ""
                }
                <tr>
                  <td>DEPOSIT ON CONTRACT</td>
                  <td class="val-col">.00</td>
                </tr>
                <tr style="border-top: 2px solid #000;">
                  <td style="font-size: 11px;">TOTAL</td>
                  <td class="val-col" style="font-size: 13px;">${formatMoney(total)}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Signature Line & Footer -->
          <div class="signature-area">
            X ____________________________________________________
          </div>
          <div class="copyright-footer">
            &copy; Dealership Application Group - Spare Parts Division
          </div>

        </div>
      </body>
    </html>
  `;
};
