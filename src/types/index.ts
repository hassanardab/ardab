//src/types/index.ts
export type PaymentMethod = "CASH" | "BANK";
export type TransactionType =
  | "INCOME"
  | "EXPENSE"
  | "BILL"
  | "TRANSPORTATION"
  | "ABDU"
  | "PAYROLL"
  | "BANK_FEE"
  | "TRANSFER";

export interface Employee {
  id: string;
  name: string;
  role: string;
}
export interface Vendor {
  id: string;
  name: string;
  balance: number;
}

export interface Transaction {
  id: string;
  projectId: string;
  type: TransactionType;
  method: PaymentMethod;
  amount: number;
  description: string;
  date: string;
  employeeId?: string; // If payroll
  vendorId?: string; // If bill/expense
}

export interface Project {
  id: string;
  name: string;
  initialCash: number;
  initialBank: number;
  currentCash: number;
  currentBank: number;
  createdAt: string;
}
export interface InvoiceItem {
  id: string;
  item: string;
  description?: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  companyName: string;
  companyLogo?: string; // base64 or local URI
  customerName: string;
  date: string; // ISO date
  items: InvoiceItem[];
  tax: number; // percentage, e.g. 15 for 15%
  discount: number; // percentage, e.g. 10 for 10%
}
