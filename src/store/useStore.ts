// src/store/useStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  Conversation,
  DEFAULT_TRANSACTION_TYPES,
  Employee,
  Invoice,
  Message,
  Project,
  Transaction,
  TransactionTypeDef,
} from "../types";

interface AppState {
  projects: Project[];
  transactions: Transaction[];
  employees: Employee[];
  invoices: Invoice[];

  // ---- Per-project transaction type CRUD ----
  addTransactionType: (projectId: string, def: TransactionTypeDef) => void;
  updateTransactionType: (
    projectId: string,
    typeId: string,
    updates: Partial<Omit<TransactionTypeDef, "id" | "isSystem">>,
  ) => void;
  removeTransactionType: (projectId: string, typeId: string) => void;
  reorderTransactionTypes: (projectId: string, orderedIds: string[]) => void;

  // ---- Projects ----
  addProject: (
    project: Omit<Project, "currentCash" | "currentBank" | "transactionTypes">,
  ) => void;
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

  // ---- Messaging ----
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

// ---------------------------------------------------------------------------
// Helpers: resolve a transaction type definition from a project's catalog.
// These replace the old hardcoded `type === "INCOME"` checks. That means any
// custom type a user creates automatically gets the right balance math.
// ---------------------------------------------------------------------------

export const resolveType = (
  project: Project | undefined,
  typeId: string,
): TransactionTypeDef | undefined =>
  project?.transactionTypes?.find((t) => t.id === typeId);

const isInflowByDef = (def: TransactionTypeDef | undefined): boolean =>
  def?.direction === "INFLOW";

/**
 * Applies a transaction to a project's cash/bank balances.
 * sign = +1 to add, -1 to reverse (used on update/remove).
 *
 * - Unknown types and NEUTRAL / affectsBalance=false types leave balances alone.
 * - TRANSFER flips cash <-> bank depending on `method`.
 * - Everything else moves by direction.
 */
const applyTransaction = (
  project: Project,
  tx: Transaction,
  sign: 1 | -1,
): Project => {
  const def = resolveType(project, tx.type);
  if (!def || !def.affectsBalance) return project;

  const amount = tx.amount * sign;

  if (def.id === "TRANSFER") {
    const isToBank = tx.method === "BANK";
    return {
      ...project,
      currentBank: project.currentBank + (isToBank ? amount : -amount),
      currentCash: project.currentCash + (isToBank ? -amount : amount),
    };
  }

  const delta = isInflowByDef(def) ? amount : -amount;

  return {
    ...project,
    currentCash:
      tx.method === "CASH" ? project.currentCash + delta : project.currentCash,
    currentBank:
      tx.method === "BANK" ? project.currentBank + delta : project.currentBank,
  };
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      projects: [],
      transactions: [],
      employees: [],
      invoices: [],

      // ---------- Per-project transaction type CRUD ----------
      addTransactionType: (projectId, def) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, transactionTypes: [...p.transactionTypes, def] }
              : p,
          ),
        })),

      updateTransactionType: (projectId, typeId, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  transactionTypes: p.transactionTypes.map((t) =>
                    t.id === typeId ? { ...t, ...updates } : t,
                  ),
                }
              : p,
          ),
        })),

      removeTransactionType: (projectId, typeId) =>
        set((state) => {
          const project = state.projects.find((p) => p.id === projectId);
          const def = project?.transactionTypes.find((t) => t.id === typeId);
          if (!def) return state;

          const inUse = state.transactions.some(
            (t) => t.projectId === projectId && t.type === typeId,
          );

          // System types and types still in use are archived, never removed.
          // This keeps old transactions' labels resolvable and preserves the
          // LOAN_RECEIVED / LOAN_GIVEN semantics used by dashboards/reports.
          if (def.isSystem || inUse) {
            return {
              projects: state.projects.map((p) =>
                p.id === projectId
                  ? {
                      ...p,
                      transactionTypes: p.transactionTypes.map((t) =>
                        t.id === typeId ? { ...t, archived: true } : t,
                      ),
                    }
                  : p,
              ),
            };
          }

          return {
            projects: state.projects.map((p) =>
              p.id === projectId
                ? {
                    ...p,
                    transactionTypes: p.transactionTypes.filter(
                      (t) => t.id !== typeId,
                    ),
                  }
                : p,
            ),
          };
        }),

      reorderTransactionTypes: (projectId, orderedIds) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            const byId = new Map(p.transactionTypes.map((t) => [t.id, t]));
            const ordered = orderedIds
              .map((id) => byId.get(id))
              .filter(Boolean) as TransactionTypeDef[];
            // Preserve any types not in the provided ordering at the end.
            const remaining = p.transactionTypes.filter(
              (t) => !orderedIds.includes(t.id),
            );
            return { ...p, transactionTypes: [...ordered, ...remaining] };
          }),
        })),

      // ---------- Projects ----------
      addProject: (projectData) =>
        set((state) => ({
          projects: [
            ...state.projects,
            {
              ...projectData,
              currentCash: projectData.initialCash,
              currentBank: projectData.initialBank,
              // Seed the defaults (shallow-copied so each project is isolated).
              transactionTypes: DEFAULT_TRANSACTION_TYPES.map((t) => ({
                ...t,
              })),
            },
          ],
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

          // 1) Reverse old effect
          const afterReverse = state.projects.map((proj) =>
            proj.id === oldTransaction.projectId
              ? applyTransaction(proj, oldTransaction, -1)
              : proj,
          );

          // 2) Apply new effect
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

      // ---------- Employees / Invoices ----------
      addEmployee: (employee) =>
        set((state) => ({
          employees: [...state.employees, employee],
        })),

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

      // ---------- Messaging ----------
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
      // Bumped to 2 because the Project schema now carries `transactionTypes`.
      version: 2,
      // Backfill defaults for projects persisted before this change.
      migrate: (persistedState: any, _version) => {
        const state = persistedState as Partial<AppState>;
        const projects = (state.projects ?? []).map((p: any) => {
          if (Array.isArray(p.transactionTypes) && p.transactionTypes.length) {
            return p as Project;
          }
          return {
            ...p,
            transactionTypes: DEFAULT_TRANSACTION_TYPES.map((t) => ({
              ...t,
            })),
          } as Project;
        });
        return { ...state, projects };
      },
    },
  ),
);
