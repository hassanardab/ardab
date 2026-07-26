export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
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
