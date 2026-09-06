// src/utils/format.ts

// ----- Existing (keep as is) -----
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatCurrencyPdf = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatNumberInput = (value: string): string => {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number(digits));
};

export const parseFormattedNumber = (value: string): number => {
  return Number(value.replace(/,/g, ""));
};

export const formatRelativeTime = (date: Date | string): string => {
  // ... existing implementation (unchanged)
  const now = new Date();
  const past = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 7) {
    return past.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } else if (diffDay >= 1) {
    return `${diffDay}d ago`;
  } else if (diffHour >= 1) {
    return `${diffHour}h ago`;
  } else if (diffMin >= 1) {
    return `${diffMin}m ago`;
  } else {
    return "Just now";
  }
};

// ----- NEW: Price formatting helpers -----
export const formatNumberWithCommas = (value: number): string => {
  if (isNaN(value) || value === 0) return "0";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

export const parseFormattedNumberWithDecimals = (value: string): number => {
  const cleaned = value.replace(/,/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export const formatPriceInputDisplay = (raw: string): string => {
  let clean = raw.replace(/,/g, "");
  const parts = clean.split(".");
  if (parts.length > 2) {
    clean = parts[0] + "." + parts.slice(1).join("");
  }
  const [intPart, decPart] = clean.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (decPart !== undefined) {
    return formattedInt + "." + decPart;
  } else if (raw.endsWith(".")) {
    return formattedInt + ".";
  } else {
    return formattedInt;
  }
};

// ----- NEW: Phone number formatting -----
/**
 * Formats a raw string of digits into US phone format: (XXX) XXX-XXXX
 * e.g., "2604823730" → "(260) 482-3730"
 * Returns the formatted string; if empty, returns empty.
 */
export const formatPhoneNumber = (digits: string): string => {
  const cleaned = digits.replace(/\D/g, "");
  if (cleaned.length === 0) return "";
  if (cleaned.length <= 3) {
    return `(${cleaned}`;
  }
  if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  }
  // limit to 10 digits
  const truncated = cleaned.slice(0, 10);
  return `(${truncated.slice(0, 3)}) ${truncated.slice(3, 6)}-${truncated.slice(6)}`;
};

/**
 * Removes all non-digit characters from a phone string.
 */
export const stripPhoneFormatting = (phone: string): string => {
  return phone.replace(/\D/g, "");
};
