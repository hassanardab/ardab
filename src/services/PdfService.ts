import { formatCurrencyPdf } from "@/utils/format";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Invoice, Project, Transaction } from "../types";

import { formatCurrencyPdfWithCents } from "@/utils/format";
import { getArabicInvoiceHtml } from "./invoiceTemplates/ar";
import { getEnglishInvoiceHtml } from "./invoiceTemplates/en";
import { getArFinancialReportHtml } from "./repoetTemplates/A4";

// ----- PDF page sizes (in points; 1 inch = 72 pt) -----
// A4: 210mm x 297mm = 595 x 842 pt
// Mobile: a tall phone-card page (~120mm x 210mm) = ~340 x 595 pt.
//         The width matters most — that's what makes text scale up on a
//         phone without pinch-zoom. Height just controls where pages break.
export const PDF_PAGE_SIZES = {
  A4: { width: 595, height: 842 },
  MOBILE: { width: 340, height: 600 },
} as const;

export type PdfPageSize = keyof typeof PDF_PAGE_SIZES;

async function getImageBase64(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.warn("Could not read image, using fallback:", error);
    return "";
  }
}

export const getInvoiceHtml = async (invoice: Invoice): Promise<string> => {
  // ----- Logo: try company logo, fallback to default app icon -----
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
  let logoDataUri = "";
  if (invoice.companyLogo) {
    try {
      logoDataUri = await getImageBase64(invoice.companyLogo);
    } catch (e) {
      console.warn("Failed to load company logo, using default.", e);
    }
  }
  if (!logoDataUri) {
    const defaultAsset = Asset.fromModule(require("@/assets/images/icon.png"));
    const base64 = await getAssetBase64(defaultAsset);
    logoDataUri = `data:image/png;base64,${base64}`;
  }

  // ----- Calculate totals -----
  const subtotal = invoice.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
  const taxAmount = (subtotal * invoice.tax) / 100;
  const discountAmount = (subtotal * invoice.discount) / 100;
  const total = subtotal + taxAmount - discountAmount;

  // ----- Choose formatter based on invoice type -----
  let formatMoney: (val: number) => string;
  if (invoice.type === "ENGLISH_INV") {
    formatMoney = formatCurrencyPdfWithCents;
  } else {
    formatMoney = formatCurrencyPdf;
  }

  const dateStr = new Date(invoice.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const escapeHtml = (value: string | undefined | null) => {
    if (!value) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  if (invoice.type === "ARABIC_INV") {
    return getArabicInvoiceHtml(
      invoice,
      logoDataUri,
      formatMoney,
      escapeHtml,
      dateStr,
      generatedDate,
      subtotal,
      taxAmount,
      discountAmount,
      total,
    );
  } else {
    return getEnglishInvoiceHtml(
      invoice,
      logoDataUri,
      formatMoney,
      escapeHtml,
      dateStr,
      generatedDate,
      subtotal,
      taxAmount,
      discountAmount,
      total,
    );
  }
};

export const exportInvoicePdf = async (invoice: Invoice) => {
  const html = await getInvoiceHtml(invoice);
  const fileName = `فاتورة-${invoice.id}-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;
  await exportPdf(html, fileName);
};

// ----- NEW signature: optional 3rd arg `options` -----
export const exportPdf = async (
  html: string,
  customFileName: string = "report.pdf",
  options?: { width: number; height: number },
) => {
  try {
    const { uri } = await Print.printToFileAsync({
      html,
      // expo-print accepts width/height in points for custom page size
      ...(options ? { width: options.width, height: options.height } : {}),
    });
    const safeFileName = customFileName.replace(/[:/\\?%*|"<>]/g, "-");

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
  periodLabel: string = "تاريخ المشروع بالكامل",
  size: "A4" | "MOBILE" = "A4",
) => {
  const html = await getArFinancialReportHtml(
    project,
    transactions,
    periodLabel,
    size,
  );

  try {
    const { uri } = await Print.printToFileAsync({ html });

    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
    });

    const rawFileName = `التقرير المالي: ${project.name}-${dateStr}.pdf`;
    const safeFileName = rawFileName.replace(/[:/\\?%*|"<>]/g, "-");

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
