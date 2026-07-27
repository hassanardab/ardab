import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Employee, Project, Transaction } from "../types";

interface AppState {
  projects: Project[];
  transactions: Transaction[];
  employees: Employee[];
  addProject: (project: Omit<Project, "currentCash" | "currentBank">) => void;
  addTransaction: (transaction: Transaction) => void;
  removeTransaction: (transactionId: string) => void;
  updateTransaction: (transaction: Transaction) => void;
  addEmployee: (employee: Employee) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      projects: [],
      transactions: [],
      employees: [],

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
    }),
    { name: "finance-storage", storage: createJSONStorage(() => AsyncStorage) },
  ),
);
