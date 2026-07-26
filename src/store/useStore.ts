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
  removeTransaction: (transactionId: string) => void; // New method
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

      // New: Remove a transaction and reverse balance impacts
      removeTransaction: (transactionId) =>
        set((state) => {
          const transaction = state.transactions.find(
            (t) => t.id === transactionId,
          );
          if (!transaction) return state;

          const updatedProjects = state.projects.map((proj) => {
            if (proj.id === transaction.projectId) {
              const isDeduction = transaction.type !== "INCOME";
              // Reverse the math
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
