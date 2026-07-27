import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AddTransactionBottomSheet from "../../components/AddTransactionBottomSheet";
import { useStore } from "../../store/useStore";
import { Transaction } from "../../types";
import { formatCurrency } from "../../utils/format";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { projects, transactions, removeTransaction } = useStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  // Filter and Pagination States
  const [timeFilter, setTimeFilter] = useState<string>("ALL");
  const [visibleCount, setVisibleCount] = useState<number>(20);

  const project = projects.find((p) => p.id === id);

  // Memoized filtering and sorting
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const startOfThisMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).getTime();
    const startOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    ).getTime();
    const endOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    ).getTime();
    const startOfThisYear = new Date(now.getFullYear(), 0, 1).getTime();

    let filtered = transactions.filter((t) => t.projectId === id);

    filtered = filtered.filter((t) => {
      const txTime = new Date(t.date).getTime();
      switch (timeFilter) {
        case "THIS_MONTH":
          return txTime >= startOfThisMonth;
        case "LAST_MONTH":
          return txTime >= startOfLastMonth && txTime <= endOfLastMonth;
        case "THIS_YEAR":
          return txTime >= startOfThisYear;
        case "ALL":
        default:
          return true;
      }
    });

    // الأحدث أولاً
    return filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [transactions, id, timeFilter]);

  // Apply Pagination limit
  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice(0, visibleCount);
  }, [filteredTransactions, visibleCount]);

  const handleLoadMore = () => {
    if (visibleCount < filteredTransactions.length) {
      setVisibleCount((prev) => prev + 20);
    }
  };

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
          headerTitle: project.name,
        }}
      />
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.reportBtn}
            // Update routing to pass the current timeFilter as a parameter
            onPress={() =>
              router.push({
                pathname: "/project/[id]/report",
                params: { id: project.id, timeFilter },
              })
            }
          >
            <Text style={styles.reportBtnText}>معاينة التقرير</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>العمليات</Text>
        </View>

        {/* شريط الفلاتر الزمنية */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {[
              { id: "ALL", label: "الكل" },
              { id: "THIS_MONTH", label: "هذا الشهر" },
              { id: "LAST_MONTH", label: "الشهر الماضي" },
              { id: "THIS_YEAR", label: "هذا العام" },
            ].map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterChip,
                  timeFilter === f.id && styles.filterChipActive,
                ]}
                onPress={() => {
                  setTimeFilter(f.id);
                  setVisibleCount(20); // إعادة تعيين التمرير عند تغيير الفلتر
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    timeFilter === f.id && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={paginatedTransactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 80 }} // لتفادي تغطية الزر العائم
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.txCard}
              onLongPress={() => {
                setSelectedTransaction(item);
                setModalVisible(true);
              }}
              activeOpacity={0.7}
            >
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
                  {item.type === "INCOME" ? "+" : "-"}
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>لا توجد معاملات بعد</Text>
          }
        />

        {/* 🔵 زر عائم (FAB) */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setSelectedTransaction(null);
            setModalVisible(true);
          }}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

        {/* المودال لإضافة أو تعديل معاملة */}
        <AddTransactionBottomSheet
          projectId={id!}
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setSelectedTransaction(null);
          }}
          transactionToEdit={selectedTransaction}
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
    marginBottom: 16, // قللنا المسافة قليلاً لاستيعاب الفلاتر
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  reportBtn: {
    backgroundColor: "#000000",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reportBtnText: { color: "white", fontWeight: "600" },
  filterContainer: {
    marginBottom: 16,
  },
  filterScroll: {
    gap: 8,
    flexDirection: "row-reverse", // لمحاذاة العناصر من اليمين لليسار
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#000000",
  },
  filterChipText: {
    color: "#4b5563",
    fontSize: 14,
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#000000",
    fontWeight: "bold",
  },
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
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    color: "white",
    fontSize: 28,
    fontWeight: "300",
    lineHeight: 30,
  },
});
