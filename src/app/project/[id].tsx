import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
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

type TimeFilter = "ALL" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR" | "CUSTOM";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { projects, transactions, removeTransaction } = useStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  // Filter and Pagination States
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("ALL");
  const [visibleCount, setVisibleCount] = useState<number>(20);

  // Custom date range
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const project = projects.find((p) => p.id === id);

  // ---- Range window derived from the selected filter ----
  const range = useMemo(() => {
    const now = new Date();
    switch (timeFilter) {
      case "THIS_MONTH":
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
          end: new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          ).getTime(),
        };
      case "LAST_MONTH":
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
          end: new Date(
            now.getFullYear(),
            now.getMonth(),
            0,
            23,
            59,
            59,
            999,
          ).getTime(),
        };
      case "THIS_YEAR":
        return {
          start: new Date(now.getFullYear(), 0, 1).getTime(),
          end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime(),
        };
      case "CUSTOM": {
        // Partial ranges allowed: only start → [start, ∞)
        //                         only end   → (−∞, end]
        const start = customStart ? customStart.getTime() : 0;
        const end = customEnd
          ? new Date(
              customEnd.getFullYear(),
              customEnd.getMonth(),
              customEnd.getDate(),
              23,
              59,
              59,
              999,
            ).getTime()
          : Infinity;
        return { start, end };
      }
      case "ALL":
      default:
        return { start: 0, end: Infinity };
    }
  }, [timeFilter, customStart, customEnd]);

  // ---- All project transactions ----
  const projectTransactions = useMemo(
    () => transactions.filter((t) => t.projectId === id),
    [transactions, id],
  );

  // ---- Filtered + sorted list ----
  const filteredTransactions = useMemo(() => {
    return projectTransactions
      .filter((t) => {
        const ts = new Date(t.date).getTime();
        return ts >= range.start && ts <= range.end;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [projectTransactions, range]);

  const paginatedTransactions = useMemo(
    () => filteredTransactions.slice(0, visibleCount),
    [filteredTransactions, visibleCount],
  );

  // ---- Summary for the active range ----
  // Balances: initial + Σ(deltas within range) — matches dashboard behaviour.
  // Loans:   only loans inside the range.
  const summary = useMemo(() => {
    let cash = project?.initialCash ?? 0;
    let bank = project?.initialBank ?? 0;
    let given = 0;
    let received = 0;

    projectTransactions.forEach((t) => {
      const ts = new Date(t.date).getTime();
      if (ts < range.start || ts > range.end) return;

      if (t.type === "TRANSFER") {
        if (t.method === "BANK") {
          // Deposit cash → bank
          bank += t.amount;
          cash -= t.amount;
        } else {
          // Withdraw bank → cash
          cash += t.amount;
          bank -= t.amount;
        }
      } else {
        const isInflow = t.type === "INCOME" || t.type === "LOAN_RECEIVED";
        const delta = isInflow ? t.amount : -t.amount;
        if (t.method === "CASH") cash += delta;
        else bank += delta;
      }

      if (t.type === "LOAN_GIVEN") given += t.amount;
      if (t.type === "LOAN_RECEIVED") received += t.amount;
    });

    return { cash, bank, given, received, net: received - given };
  }, [project, projectTransactions, range]);

  // ---- Period label for the summary header ----
  const periodLabel = useMemo(() => {
    if (timeFilter === "ALL") return "كل الفترات";
    if (timeFilter === "THIS_MONTH") return "هذا الشهر";
    if (timeFilter === "LAST_MONTH") return "الشهر الماضي";
    if (timeFilter === "THIS_YEAR") return "هذا العام";
    const s = customStart ? customStart.toISOString().split("T")[0] : "...";
    const e = customEnd ? customEnd.toISOString().split("T")[0] : "...";
    return `${s} ← ${e}`;
  }, [timeFilter, customStart, customEnd]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "INCOME":
        return "إستلام مبلغ";
      case "GIVEAWAY":
        return "تسليم مبلغ";
      case "EXPENSE":
        return "البقالة";
      case "BILL":
        return "فاتورة";
      case "PAYROLL":
        return "رواتب";
      case "TRANSFER":
        return "تحويل";
      case "BANK_FEE":
        return "رسوم تحويل بنكي";
      case "ABDU":
        return "منصرف خاص ";
      case "MEDICAL":
        return "علاجات وأدوية";
      case "TRANSPORTATION":
        return "مواصلات";
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

  const onStartChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowStartPicker(false);
    if (selectedDate) setCustomStart(selectedDate);
  };

  const onEndChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowEndPicker(false);
    if (selectedDate) setCustomEnd(selectedDate);
  };

  const openReport = () => {
    router.push({
      pathname: "/project/[id]/report",
      params: {
        id: project!.id,
        timeFilter,
        customStart: customStart?.toISOString() ?? "",
        customEnd: customEnd?.toISOString() ?? "",
      },
    });
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
          <TouchableOpacity style={styles.reportBtn} onPress={openReport}>
            <Text style={styles.reportBtnText}>معاينة التقرير</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>العمليات</Text>
        </View>

        {/* ====== SUMMARY CARD ====== */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryPeriodRow}>
            <Text style={styles.summaryPeriodLabel}>{periodLabel}</Text>
            <Text style={styles.summaryPeriodTitle}>الملخص</Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>نقدي</Text>
              <Text style={[styles.summaryValue, styles.cash]}>
                {formatCurrency(summary.cash)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>بنكي</Text>
              <Text style={[styles.summaryValue, styles.bank]}>
                {formatCurrency(summary.bank)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>قروض مُعطاة</Text>
              <Text style={[styles.summaryValue, styles.loanGiven]}>
                {formatCurrency(summary.given)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>قروض مأخوذة</Text>
              <Text style={[styles.summaryValue, styles.loanReceived]}>
                {formatCurrency(summary.received)}
              </Text>
            </View>
          </View>

          <View style={styles.netLoanContainer}>
            <Text style={styles.netLoanLabel}>صافي القروض</Text>
            <Text
              style={[
                styles.netLoanValue,
                summary.net >= 0 ? styles.positiveNet : styles.negativeNet,
              ]}
            >
              {formatCurrency(summary.net)}
            </Text>
          </View>
        </View>

        {/* ====== FILTER CHIPS ====== */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {(
              [
                { id: "ALL", label: "الكل" },
                { id: "THIS_MONTH", label: "هذا الشهر" },
                { id: "LAST_MONTH", label: "الشهر الماضي" },
                { id: "THIS_YEAR", label: "هذا العام" },
                { id: "CUSTOM", label: "مخصص" },
              ] as { id: TimeFilter; label: string }[]
            ).map((f) => (
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

          {/* Custom range pickers */}
          {timeFilter === "CUSTOM" && (
            <View style={styles.customRangeRow}>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.dateBtnLabel}>من</Text>
                <Text style={styles.dateBtnValue}>
                  {customStart
                    ? customStart.toISOString().split("T")[0]
                    : "اختر"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.dateBtnLabel}>إلى</Text>
                <Text style={styles.dateBtnValue}>
                  {customEnd ? customEnd.toISOString().split("T")[0] : "اختر"}
                </Text>
              </TouchableOpacity>

              {(customStart || customEnd) && (
                <TouchableOpacity
                  style={styles.clearRangeBtn}
                  onPress={() => {
                    setCustomStart(null);
                    setCustomEnd(null);
                  }}
                >
                  <Text style={styles.clearRangeBtnText}>مسح</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {showStartPicker && (
            <DateTimePicker
              value={customStart || new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onStartChange}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={customEnd || new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onEndChange}
            />
          )}

          {Platform.OS === "ios" && showStartPicker && (
            <TouchableOpacity
              style={styles.iosDoneBtn}
              onPress={() => setShowStartPicker(false)}
            >
              <Text style={styles.iosDoneBtnText}>تم</Text>
            </TouchableOpacity>
          )}
          {Platform.OS === "ios" && showEndPicker && (
            <TouchableOpacity
              style={styles.iosDoneBtn}
              onPress={() => setShowEndPicker(false)}
            >
              <Text style={styles.iosDoneBtnText}>تم</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ====== TRANSACTION LIST ====== */}
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
            <Text style={styles.emptyText}>لا توجد معاملات في هذه الفترة</Text>
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
  summaryPeriodRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  summaryPeriodTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  summaryPeriodLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
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
  loanGiven: { color: "#dc2626" },
  loanReceived: { color: "#8B5CF6" },
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
  positiveNet: { color: "#8B5CF6" },
  negativeNet: { color: "#dc2626" },

  // ----- Filters -----
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

  // ----- Custom range -----
  customRangeRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 12,
    alignItems: "stretch",
  },
  dateBtn: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  dateBtnLabel: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: 2,
  },
  dateBtnValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "700",
  },
  clearRangeBtn: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#fee2e2",
  },
  clearRangeBtnText: {
    color: "#dc2626",
    fontWeight: "700",
    fontSize: 12,
  },
  iosDoneBtn: {
    marginTop: 8,
    backgroundColor: "#f3f4f6",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  iosDoneBtnText: {
    color: "#111827",
    fontWeight: "700",
  },

  // ----- Transaction Cards -----
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
