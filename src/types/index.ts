//src/types/index.ts
export type PaymentMethod = "CASH" | "BANK";
export type TransactionType =
  | "INCOME"
  | "EXPENSE"
  | "BILL"
  | "PAYROLL"
  | "TRANSFER";

export interface Employee {
  id: string;
  name: string;
  role: string;
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
  vendorName?: string; // If bill/expense
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
