import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { generateFinancialReport } from "../services/PdfService";
import { useStore } from "../store/useStore";

export default function ReportsScreen() {
  const { projects, transactions } = useStore();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Generate Reports</Text>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.reportCard}>
            <View>
              <Text style={styles.projectName}>{item.name}</Text>
              <Text style={styles.subText}>
                {transactions.filter((t) => t.projectId === item.id).length}{" "}
                transactions recorded
              </Text>
            </View>
            <TouchableOpacity
              style={styles.pdfBtn}
              onPress={() => generateFinancialReport(item, transactions)}
            >
              <Text style={styles.pdfBtnText}>Export PDF</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6", padding: 16 },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  reportCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  projectName: { fontSize: 16, fontWeight: "600" },
  subText: { color: "#6b7280", fontSize: 12, marginTop: 4 },
  pdfBtn: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  pdfBtnText: { color: "white", fontWeight: "500" },
});
