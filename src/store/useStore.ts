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
          // Update the specific project's balances based on the transaction
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
    }),
    {
      name: "finance-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
