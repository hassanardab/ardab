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
  // Keep digits only
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
