// src/types/index.ts

export type PaymentMethod = "CASH" | "BANK";

/**
 * A transaction type is now DATA, not a hardcoded union.
 * Each project owns its own list of these.
 *
 * direction:
 *   "INFLOW"  -> increases cash/bank (e.g. INCOME, LOAN_RECEIVED)
 *   "OUTFLOW" -> decreases cash/bank (e.g. EXPENSE, BILL, PAYROLL)
 *   "NEUTRAL" -> does NOT affect cash/bank balances (e.g. a pure
 *                note/annotation type). Useful for future custom types.
 *
 * affectsBalance: false lets you add informational-only types.
 * color: used by list rows, chips, and the PDF report.
 * isSystem: true for the seeded defaults; system types can be hidden
 *           but not deleted (keeps LOAN_RECEIVED/INCOME semantics safe
 *           for the net-loan calculation in the dashboard/report).
 */
export type TransactionDirection = "INFLOW" | "OUTFLOW" | "NEUTRAL";

export interface TransactionTypeDef {
  id: string; // stable key, e.g. "INCOME", "MY_CUSTOM_TYPE"
  label: string; // Arabic display label
  labelEn?: string; // optional English label for the EN invoice PDF
  direction: TransactionDirection;
  affectsBalance: boolean;
  color: string; // hex, used for the type badge + report
  isSystem?: boolean; // true for seeded defaults
  archived?: boolean; // hidden from pickers but kept on old transactions
  // Optional overrides for loan math (defaults derived from id):
  countsAsLoanGiven?: boolean;
  countsAsLoanReceived?: boolean;
}

/** The seed list a new project starts with. Mirrors today's union. */
export const DEFAULT_TRANSACTION_TYPES: TransactionTypeDef[] = [
  {
    id: "INCOME",
    label: "إستلام مبلغ",
    direction: "INFLOW",
    affectsBalance: true,
    color: "#10b981",
    isSystem: true,
  },
  {
    id: "LOAN_RECEIVED",
    label: "قرض مأخوذ",
    direction: "INFLOW",
    affectsBalance: true,
    color: "#8B5CF6",
    isSystem: true,
    countsAsLoanReceived: true,
  },
  {
    id: "LOAN_GIVEN",
    label: "قرض مُعطى",
    direction: "OUTFLOW",
    affectsBalance: true,
    color: "#EF4444",
    isSystem: true,
    countsAsLoanGiven: true,
  },
  {
    id: "EXPENSE",
    label: "البقالة",
    direction: "OUTFLOW",
    affectsBalance: true,
    color: "#ef4444",
    isSystem: true,
  },
  {
    id: "BILL",
    label: "فاتورة",
    direction: "OUTFLOW",
    affectsBalance: true,
    color: "#ef4444",
    isSystem: true,
  },
  {
    id: "PAYROLL",
    label: "رواتب",
    direction: "OUTFLOW",
    affectsBalance: true,
    color: "#ef4444",
    isSystem: true,
  },
  {
    id: "ABDU",
    label: "منصرف خاص",
    direction: "OUTFLOW",
    affectsBalance: true,
    color: "#ef4444",
    isSystem: true,
  },
  {
    id: "MEDICAL",
    label: "علاجات وأدوية",
    direction: "OUTFLOW",
    affectsBalance: true,
    color: "#ef4444",
    isSystem: true,
  },
  {
    id: "TRANSPORTATION",
    label: "مواصلات",
    direction: "OUTFLOW",
    affectsBalance: true,
    color: "#ef4444",
    isSystem: true,
  },
  {
    id: "BANK_FEE",
    label: "رسوم تحويل بنكي",
    direction: "OUTFLOW",
    affectsBalance: true,
    color: "#ef4444",
    isSystem: true,
  },
  {
    id: "TRANSFER",
    label: "تحويل داخلي",
    direction: "NEUTRAL",
    affectsBalance: true,
    color: "#2563eb",
    isSystem: true,
  },
  {
    id: "GIVEAWAY",
    label: "تسليم مبلغ",
    direction: "OUTFLOW",
    affectsBalance: true,
    color: "#ef4444",
    isSystem: true,
  },
];

export interface Project {
  id: string;
  name: string;
  initialCash: number;
  initialBank: number;
  currentCash: number;
  currentBank: number;
  createdAt: string;
  /** NEW: per-project transaction type catalog. */
  transactionTypes: TransactionTypeDef[];
}

// Transaction now stores a string id (one of the project's type ids).
export interface Transaction {
  id: string;
  projectId: string;
  type: string; // CHANGED: was TransactionType union
  method: PaymentMethod;
  amount: number;
  description: string;
  date: string;
  employeeId?: string;
  vendorId?: string;
}

// NEW: invoice type
export type InvoiceType = "ARABIC_INV" | "ENGLISH_INV";

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
  type: InvoiceType;
  companyName: string;
  companyLogo?: string;
  invoiceNumber: string; // NEW — dynamic invoice number
  paidAmount: number; // NEW — amount paid up-front
  companyAddress?: string; // NEW
  customerName: string;
  companyPhone?: string; // NEW: company phone
  date: string;
  phoneNumber: string;
  address: string;
  items: InvoiceItem[];
  tax: number;
  discount: number;
}
// src/types/index.ts

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    timestamp: Date | string;
    senderId: string;
  };
  updatedAt: Date | string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: Date | string;
  status: "sent" | "delivered" | "read";
}
