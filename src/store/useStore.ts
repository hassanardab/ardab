// src/store/useStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  Conversation,
  Employee,
  Invoice,
  Message,
  Project,
  Transaction,
} from "../types";

interface AppState {
  // ----- Existing state -----
  projects: Project[];
  transactions: Transaction[];
  employees: Employee[];
  invoices: Invoice[];
  addProject: (project: Omit<Project, "currentCash" | "currentBank">) => void;
  addTransaction: (transaction: Transaction) => void;
  updateProject: (
    id: string,
    updates: Partial<Omit<Project, "id" | "createdAt">>,
  ) => void;
  removeTransaction: (transactionId: string) => void;
  updateTransaction: (transaction: Transaction) => void;
  addEmployee: (employee: Employee) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Omit<Invoice, "id">>) => void;
  deleteInvoice: (id: string) => void;

  // ----- NEW: Messaging state -----
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  setConversations: (convs: Conversation[]) => void;
  addConversation: (conv: Conversation) => void;
  setMessages: (conversationId: string, msgs: Message[]) => void;
  addMessage: (conversationId: string, msg: Message) => void;
}
const INITIAL_CONV_ID = "conv1";

const defaultConversations: Conversation[] = [
  {
    id: INITIAL_CONV_ID,
    participants: ["user1", "user2"],
    lastMessage: {
      text: "Hey, check out the new design system update!",
      timestamp: new Date(),
      senderId: "user2",
    },
    updatedAt: new Date(),
  },
];

const defaultMessages: Record<string, Message[]> = {
  [INITIAL_CONV_ID]: [
    {
      id: "m1",
      conversationId: INITIAL_CONV_ID,
      senderId: "user2",
      text: "Hey, check out the new design system update!",
      timestamp: new Date(Date.now() - 60000),
      status: "read",
    },
    {
      id: "m2",
      conversationId: INITIAL_CONV_ID,
      senderId: "user1",
      text: "Looks clean! The inverted flatlist behavior works smoothly now.",
      timestamp: new Date(Date.now() - 30000),
      status: "delivered",
    },
  ],
};
export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // ----- Existing initial state -----
      projects: [],
      transactions: [],
      employees: [],
      invoices: [],

      // ----- Existing actions -----
      addInvoice: (invoice) =>
        set((state) => ({
          invoices: [...state.invoices, invoice],
        })),
      updateInvoice: (id, updates) =>
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id ? { ...inv, ...updates } : inv,
          ),
        })),
      deleteInvoice: (id) =>
        set((state) => ({
          invoices: state.invoices.filter((inv) => inv.id !== id),
        })),
      addProject: (projectData) =>
        set((state) => ({
          projects: [
            ...state.projects,
            {
              ...projectData,
              currentCash: projectData.initialCash,
              currentBank: projectData.initialBank,
            },
          ],
        })),
      addEmployee: (employee) =>
        set((state) => ({
          employees: [...state.employees, employee],
        })),
      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),
      addTransaction: (transaction) =>
        set((state) => {
          const updatedProjects = state.projects.map((proj) => {
            if (proj.id === transaction.projectId) {
              if (transaction.type === "TRANSFER") {
                const isToBank = transaction.method === "BANK";
                return {
                  ...proj,
                  currentBank:
                    proj.currentBank +
                    (isToBank ? transaction.amount : -transaction.amount),
                  currentCash:
                    proj.currentCash +
                    (isToBank ? -transaction.amount : transaction.amount),
                };
              }
              const isDeduction = transaction.type !== "INCOME";
              const amountChange = isDeduction
                ? -transaction.amount
                : transaction.amount;
              return {
                ...proj,
                currentCash:
                  transaction.method === "CASH"
                    ? proj.currentCash + amountChange
                    : proj.currentCash,
                currentBank:
                  transaction.method === "BANK"
                    ? proj.currentBank + amountChange
                    : proj.currentBank,
              };
            }
            return proj;
          });
          return {
            transactions: [...state.transactions, transaction],
            projects: updatedProjects,
          };
        }),
      updateTransaction: (updatedTransaction) =>
        set((state) => {
          const oldTransaction = state.transactions.find(
            (t) => t.id === updatedTransaction.id,
          );
          if (!oldTransaction) return state;

          // 1. عكس تأثير المعاملة القديمة على الأرصدة
          const tempProjects = state.projects.map((proj) => {
            if (proj.id === oldTransaction.projectId) {
              if (oldTransaction.type === "TRANSFER") {
                const isToBank = oldTransaction.method === "BANK";
                return {
                  ...proj,
                  currentBank:
                    proj.currentBank -
                    (isToBank ? oldTransaction.amount : -oldTransaction.amount),
                  currentCash:
                    proj.currentCash -
                    (isToBank ? -oldTransaction.amount : oldTransaction.amount),
                };
              }
              const isDeduction = oldTransaction.type !== "INCOME";
              const amountChange = isDeduction
                ? oldTransaction.amount
                : -oldTransaction.amount;
              return {
                ...proj,
                currentCash:
                  oldTransaction.method === "CASH"
                    ? proj.currentCash + amountChange
                    : proj.currentCash,
                currentBank:
                  oldTransaction.method === "BANK"
                    ? proj.currentBank + amountChange
                    : proj.currentBank,
              };
            }
            return proj;
          });

          // 2. تطبيق تأثير المعاملة الجديدة على الأرصدة
          const finalProjects = tempProjects.map((proj) => {
            if (proj.id === updatedTransaction.projectId) {
              if (updatedTransaction.type === "TRANSFER") {
                const isToBank = updatedTransaction.method === "BANK";
                return {
                  ...proj,
                  currentBank:
                    proj.currentBank +
                    (isToBank
                      ? updatedTransaction.amount
                      : -updatedTransaction.amount),
                  currentCash:
                    proj.currentCash +
                    (isToBank
                      ? -updatedTransaction.amount
                      : updatedTransaction.amount),
                };
              }
              const isDeduction = updatedTransaction.type !== "INCOME";
              const amountChange = isDeduction
                ? -updatedTransaction.amount
                : updatedTransaction.amount;
              return {
                ...proj,
                currentCash:
                  updatedTransaction.method === "CASH"
                    ? proj.currentCash + amountChange
                    : proj.currentCash,
                currentBank:
                  updatedTransaction.method === "BANK"
                    ? proj.currentBank + amountChange
                    : proj.currentBank,
              };
            }
            return proj;
          });

          return {
            transactions: state.transactions.map((t) =>
              t.id === updatedTransaction.id ? updatedTransaction : t,
            ),
            projects: finalProjects,
          };
        }),
      removeTransaction: (transactionId) =>
        set((state) => {
          const transaction = state.transactions.find(
            (t) => t.id === transactionId,
          );
          if (!transaction) return state;

          const updatedProjects = state.projects.map((proj) => {
            if (proj.id === transaction.projectId) {
              if (transaction.type === "TRANSFER") {
                const isToBank = transaction.method === "BANK";
                return {
                  ...proj,
                  currentBank:
                    proj.currentBank -
                    (isToBank ? transaction.amount : -transaction.amount),
                  currentCash:
                    proj.currentCash -
                    (isToBank ? -transaction.amount : transaction.amount),
                };
              }
              const isDeduction = transaction.type !== "INCOME";
              const amountChange = isDeduction
                ? transaction.amount
                : -transaction.amount;
              return {
                ...proj,
                currentCash:
                  transaction.method === "CASH"
                    ? proj.currentCash + amountChange
                    : proj.currentCash,
                currentBank:
                  transaction.method === "BANK"
                    ? proj.currentBank + amountChange
                    : proj.currentBank,
              };
            }
            return proj;
          });

          return {
            transactions: state.transactions.filter(
              (t) => t.id !== transactionId,
            ),
            projects: updatedProjects,
          };
        }),

      // ----- NEW: Messaging state & actions -----
      conversations: defaultConversations,
      messages: defaultMessages,

      setConversations: (convs) => set({ conversations: convs }),
      addConversation: (conv) =>
        set((state) => ({ conversations: [conv, ...state.conversations] })),
      setMessages: (conversationId, msgs) =>
        set((state) => ({
          messages: { ...state.messages, [conversationId]: msgs },
        })),

      addMessage: (conversationId, msg) =>
        set((state) => {
          const currentMsgs = state.messages[conversationId] || [];
          // Prepend to array because FlatList is inverted (index 0 is bottom)
          const updatedMsgs = [msg, ...currentMsgs];

          // Update parent conversation's metadata
          const updatedConversations = state.conversations.map((conv) => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                lastMessage: {
                  text: msg.text,
                  timestamp: msg.timestamp,
                  senderId: msg.senderId,
                },
                updatedAt: msg.timestamp,
              };
            }
            return conv;
          });

          return {
            messages: {
              ...state.messages,
              [conversationId]: updatedMsgs,
            },
            conversations: updatedConversations,
          };
        }),
    }),
    {
      name: "finance-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
