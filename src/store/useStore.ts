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
  removeProject: (projectId: string) => void;
  removeTransaction: (transactionId: string) => void;
  updateTransaction: (transaction: Transaction) => void;
  addEmployee: (employee: Employee) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Omit<Invoice, "id">>) => void;
  deleteInvoice: (id: string) => void;

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

// ----- HELPER: determines if a transaction is an inflow (increases balance) -----
const isInflow = (type: string): boolean => {
  return type === "INCOME" || type === "LOAN_RECEIVED";
};

// ----- HELPER: applies a transaction effect to a project's balances -----
const applyTransaction = (project: Project, tx: Transaction, sign: 1 | -1) => {
  const multiplier = sign; // +1 for add, -1 for remove/reverse
  const amount = tx.amount * multiplier;

  if (tx.type === "TRANSFER") {
    const isToBank = tx.method === "BANK";
    return {
      ...project,
      currentBank: project.currentBank + (isToBank ? amount : -amount),
      currentCash: project.currentCash + (isToBank ? -amount : amount),
    };
  }

  const inflow = isInflow(tx.type);
  const delta = inflow ? amount : -amount;

  return {
    ...project,
    currentCash:
      tx.method === "CASH" ? project.currentCash + delta : project.currentCash,
    currentBank:
      tx.method === "BANK" ? project.currentBank + delta : project.currentBank,
  };
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      projects: [],
      transactions: [],
      employees: [],
      invoices: [],

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
      removeProject: (projectId) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
          transactions: state.transactions.filter(
            (t) => t.projectId !== projectId,
          ),
        })),
      addTransaction: (transaction) =>
        set((state) => {
          const updatedProjects = state.projects.map((proj) =>
            proj.id === transaction.projectId
              ? applyTransaction(proj, transaction, 1)
              : proj,
          );
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

          // Reverse old transaction
          const afterReverse = state.projects.map((proj) =>
            proj.id === oldTransaction.projectId
              ? applyTransaction(proj, oldTransaction, -1)
              : proj,
          );

          // Apply new transaction
          const finalProjects = afterReverse.map((proj) =>
            proj.id === updatedTransaction.projectId
              ? applyTransaction(proj, updatedTransaction, 1)
              : proj,
          );

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

          const updatedProjects = state.projects.map((proj) =>
            proj.id === transaction.projectId
              ? applyTransaction(proj, transaction, -1)
              : proj,
          );

          return {
            transactions: state.transactions.filter(
              (t) => t.id !== transactionId,
            ),
            projects: updatedProjects,
          };
        }),

      // ----- Messaging -----
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
          const updatedMsgs = [msg, ...currentMsgs];

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
