// src/types/index.ts

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

// NEW: invoice type
export type InvoiceType = "BODY_SHOP" | "SPARE_PARTS";

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
  employeeId?: string;
  vendorId?: string;
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
  type: InvoiceType; // NEW
  companyName: string;
  companyLogo?: string;
  customerName: string;
  date: string;
  items: InvoiceItem[];
  tax: number;
  discount: number;
}
