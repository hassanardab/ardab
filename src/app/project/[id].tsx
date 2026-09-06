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

  // Compute loan totals from all project transactions (not filtered)
  const loanTotals = useMemo(() => {
    const projectTxs = transactions.filter((t) => t.projectId === id);
    const given = projectTxs
      .filter((t) => t.type === "LOAN_GIVEN")
      .reduce((sum, t) => sum + t.amount, 0);
    const received = projectTxs
      .filter((t) => t.type === "LOAN_RECEIVED")
      .reduce((sum, t) => sum + t.amount, 0);
    return { given, received, net: received - given };
  }, [transactions, id]);

  // Memoized filtering and sorting (unchanged)
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

    return filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [transactions, id, timeFilter]);

  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice(0, visibleCount);
  }, [filteredTransactions, visibleCount]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "INCOME":
        return "دخل";
      case "EXPENSE":
        return "مصروف";
      case "BILL":
        return "فاتورة";
      case "PAYROLL":
        return "رواتب";
      case "TRANSFER":
        return "تحويل";
      case "BANK_FEE":
        return "رسوم تحويل بنكي";
      case "ABDU":
        return "منصرف عبدالمنعم";
      case "TRANSPORTATION":
        return "ترحيل ومواصلات";
      case "LOAN_GIVEN":
        return "قرض مُعطى";
      case "LOAN_RECEIVED":
        return "قرض مأخوذ";
      default:
        return type;
    }
  };

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

        {/* ====== SUMMARY CARD ====== */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>نقدي</Text>
              <Text style={[styles.summaryValue, styles.cash]}>
                {formatCurrency(project.currentCash)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>بنكي</Text>
              <Text style={[styles.summaryValue, styles.bank]}>
                {formatCurrency(project.currentBank)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>قروض مُعطاة</Text>
              <Text style={[styles.summaryValue, styles.loanGiven]}>
                {formatCurrency(loanTotals.given)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>قروض مأخوذة</Text>
              <Text style={[styles.summaryValue, styles.loanReceived]}>
                {formatCurrency(loanTotals.received)}
              </Text>
            </View>
          </View>

          <View style={styles.netLoanContainer}>
            <Text style={styles.netLoanLabel}>صافي القروض</Text>
            <Text
              style={[
                styles.netLoanValue,
                loanTotals.net >= 0 ? styles.positiveNet : styles.negativeNet,
              ]}
            >
              {formatCurrency(loanTotals.net)}
            </Text>
          </View>
        </View>

        {/* Filter Chips */}
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
                  setVisibleCount(20);
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

        {/* Transaction List */}
        <FlatList
          data={paginatedTransactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 80 }}
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
                  <View style={styles.txMetaRow}>
                    <Text style={styles.txType}>{getTypeLabel(item.type)}</Text>
                    <Text style={styles.txDate}>
                      {new Date(item.date).toLocaleDateString("ar-EG")} -{" "}
                      {item.method === "CASH" ? "نقدي" : "بنكي"}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.txAmount,
                    item.type === "INCOME" || item.type === "LOAN_RECEIVED"
                      ? styles.income
                      : styles.expense,
                  ]}
                >
                  {item.type === "INCOME" || item.type === "LOAN_RECEIVED"
                    ? "+"
                    : "-"}
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>لا توجد معاملات بعد</Text>
          }
        />

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setSelectedTransaction(null);
            setModalVisible(true);
          }}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

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
    marginBottom: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  reportBtn: {
    backgroundColor: "#000000",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reportBtnText: { color: "white", fontWeight: "600" },

  // ----- Summary Card -----
  summaryContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 4,
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  cash: { color: "#059669" },
  bank: { color: "#2563eb" },
  loanGiven: { color: "#dc2626" }, // red for money given away
  loanReceived: { color: "#8B5CF6" }, // purple for money received
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 10,
  },
  netLoanContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  netLoanLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  netLoanValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  positiveNet: { color: "#8B5CF6" }, // purple when net is positive (received more)
  negativeNet: { color: "#dc2626" }, // red when net is negative (gave more)

  // ----- Filters (unchanged) -----
  filterContainer: {
    marginBottom: 16,
  },
  filterScroll: {
    gap: 8,
    flexDirection: "row-reverse",
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

  // ----- Transaction Cards (unchanged) -----
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
  txMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  txType: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
});
