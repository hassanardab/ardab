import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useStore } from "../store/useStore";

export default function DashboardScreen() {
  const { projects, addProject, addTransaction } = useStore();
  const [newProjectName, setNewProjectName] = useState("");

  const handleCreateProject = () => {
    if (!newProjectName) return;
    addProject({
      id: Date.now().toString(),
      name: newProjectName,
      initialCash: 0,
      initialBank: 0,
      createdAt: new Date().toISOString(),
    });
    setNewProjectName("");
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Active Projects</Text>

      {projects.map((project) => (
        <View key={project.id} style={styles.card}>
          <Text style={styles.cardTitle}>{project.name}</Text>

          <View style={styles.balanceRow}>
            <View style={styles.balanceBlock}>
              <Text style={styles.label}>Cash Balance (Verify)</Text>
              <Text style={styles.cashAmount}>
                ${project.currentCash.toFixed(2)}
              </Text>
            </View>
            <View style={styles.balanceBlock}>
              <Text style={styles.label}>Bank Balance (Verify)</Text>
              <Text style={styles.bankAmount}>
                ${project.currentBank.toFixed(2)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              addTransaction({
                id: Date.now().toString(),
                projectId: project.id,
                type: "EXPENSE",
                method: "CASH",
                amount: 150,
                description: "Lumber materials",
                date: new Date().toISOString(),
              });
            }}
          >
            <Text style={styles.actionBtnText}>+ Add Transaction</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="New Project Name"
          value={newProjectName}
          onChangeText={setNewProjectName}
        />
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleCreateProject}
        >
          <Text style={styles.primaryBtnText}>Create Project</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6", padding: 16 },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#111827",
  },
  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  balanceBlock: { flex: 1 },
  label: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  cashAmount: { fontSize: 20, fontWeight: "bold", color: "#059669" },
  bankAmount: { fontSize: 20, fontWeight: "bold", color: "#2563eb" },
  actionBtn: {
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnText: { color: "#374151", fontWeight: "500" },
  form: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: "#111827",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryBtnText: { color: "white", fontWeight: "600" },
});
