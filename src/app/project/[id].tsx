//src/app/project/[id].tsx
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useStore } from "../../store/useStore";
import { formatCurrency } from "../../utils/format";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { projects, transactions, removeTransaction } = useStore();

  const project = projects.find((p) => p.id === id);
  const projectTransactions = transactions.filter((t) => t.projectId === id);

  if (!project) {
    return (
      <View style={styles.center}>
        <Text>المشروع غير موجود</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitleAlign: "center",
          headerTitle: project ? project.name : "المشروع",
        }}
      />
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => router.push(`/project/${project.id}/report`)}
          >
            <Text style={styles.reportBtnText}>معاينة التقرير</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>العمليات</Text>
        </View>

        <FlatList
          data={projectTransactions.reverse()}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.txCard}>
              <View style={styles.txRow}>
                <TouchableOpacity
                  onPress={() => removeTransaction(item.id)}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteBtnText}>حذف</Text>
                </TouchableOpacity>

                <View style={styles.txInfo}>
                  <Text style={styles.txDesc}>{item.description}</Text>
                  <Text style={styles.txDate}>
                    {new Date(item.date).toLocaleDateString("ar-EG")} -{" "}
                    {item.method === "CASH" ? "نقدي" : "بنكي"}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.txAmount,
                    item.type === "INCOME" ? styles.income : styles.expense,
                  ]}
                >
                  {item.type === "INCOME" ? "+" : "-"}$
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>لا توجد معاملات بعد</Text>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  reportBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reportBtnText: { color: "white", fontWeight: "600" },
  txCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  txInfo: { flex: 1, alignItems: "flex-end", paddingRight: 16 },
  txDesc: { fontSize: 16, fontWeight: "500", color: "#374151" },
  txDate: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  txAmount: { fontSize: 18, fontWeight: "bold" },
  income: { color: "#10b981" },
  expense: { color: "#ef4444" },
  deleteBtn: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteBtnText: { color: "#dc2626", fontWeight: "600", fontSize: 12 },
  emptyText: { textAlign: "center", color: "#6b7280", marginTop: 40 },
});
