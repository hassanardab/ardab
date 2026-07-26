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
              // Handle Transfers between Bank and Cash
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

              // Handle standard Income/Expenses
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

      removeTransaction: (transactionId) =>
        set((state) => {
          const transaction = state.transactions.find(
            (t) => t.id === transactionId,
          );
          if (!transaction) return state;

          const updatedProjects = state.projects.map((proj) => {
            if (proj.id === transaction.projectId) {
              // Reverse Transfer logic
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

              // Reverse standard Income/Expense logic
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
