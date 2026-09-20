import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AddTransactionBottomSheet from "../components/AddTransactionBottomSheet";
import { useStore } from "../store/useStore";
import { Project } from "../types";
import { formatCurrency } from "../utils/format";

type DateFilterType =
  | "ALL"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_YEAR"
  | "CUSTOM";

export default function DashboardScreen() {
  const router = useRouter();
  const { projects, transactions, addProject, updateProject } = useStore();
  const [newProjectName, setNewProjectName] = useState("");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );

  // ---------- Date range filter state ----------
  const [dateFilter, setDateFilter] = useState<DateFilterType>("ALL");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // ---------- Handlers ----------
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

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setEditName(project.name);
  };

  const saveEdit = () => {
    if (editingProject && editName.trim()) {
      updateProject(editingProject.id, { name: editName.trim() });
      setEditingProject(null);
      setEditName("");
    }
  };

  const openTransactionModal = (projectId: string) => {
    setSelectedProjectId(projectId);
    setIsModalVisible(true);
  };

  // ---------- Date range helpers ----------
  const getRange = (): { start: number; end: number } => {
    const now = new Date();
    switch (dateFilter) {
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
  };

  // Compute all project balances in one pass, keyed by projectId
  const projectBalances = useMemo(() => {
    const { start, end } = getRange();
    const result: Record<
      string,
      { cash: number; bank: number; loanBalance: number }
    > = {};

    projects.forEach((project) => {
      let cash = project.initialCash;
      let bank = project.initialBank;
      let loanBalance = 0;

      transactions
        .filter((t) => t.projectId === project.id)
        .forEach((t) => {
          const ts = new Date(t.date).getTime();
          if (ts < start || ts > end) return;

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

          if (t.type === "LOAN_RECEIVED") loanBalance += t.amount;
          if (t.type === "LOAN_GIVEN") loanBalance -= t.amount;
        });

      result[project.id] = { cash, bank, loanBalance };
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, transactions, dateFilter, customStart, customEnd]);

  // Formatted "current range" text
  const periodLabel = useMemo(() => {
    if (dateFilter === "ALL") return "كل الفترات";
    if (dateFilter === "THIS_MONTH") return "هذا الشهر";
    if (dateFilter === "LAST_MONTH") return "الشهر الماضي";
    if (dateFilter === "THIS_YEAR") return "هذا العام";
    const s = customStart ? customStart.toISOString().split("T")[0] : "...";
    const e = customEnd ? customEnd.toISOString().split("T")[0] : "...";
    return `${s} ← ${e}`;
  }, [dateFilter, customStart, customEnd]);

  // ---------- Date pickers ----------
  const onStartChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowStartPicker(false);
    if (selectedDate) setCustomStart(selectedDate);
  };

  const onEndChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowEndPicker(false);
    if (selectedDate) setCustomEnd(selectedDate);
  };

  // Format today's date in Arabic
  const formattedDate = new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top Header Bar with Date */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.dateText}>{formattedDate}</Text>
          <Text style={styles.header}>المشاريع النشطة</Text>
        </View>
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logo}
        />
      </View>

      {/* ====== DATE RANGE FILTER ====== */}
      <View style={styles.filterCard}>
        <View style={styles.filterHeaderRow}>
          <Text style={styles.filterPeriodLabel}>{periodLabel}</Text>
          <Text style={styles.filterTitle}>الفترة الزمنية</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsScroll}
        >
          {(
            [
              { id: "ALL", label: "الكل" },
              { id: "THIS_MONTH", label: "هذا الشهر" },
              { id: "LAST_MONTH", label: "الشهر الماضي" },
              { id: "THIS_YEAR", label: "هذا العام" },
              { id: "CUSTOM", label: "مخصص" },
            ] as { id: DateFilterType; label: string }[]
          ).map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.filterChip,
                dateFilter === f.id && styles.filterChipActive,
              ]}
              onPress={() => setDateFilter(f.id)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  dateFilter === f.id && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {dateFilter === "CUSTOM" && (
          <View style={styles.customRangeRow}>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.dateBtnLabel}>من</Text>
              <Text style={styles.dateBtnValue}>
                {customStart ? customStart.toISOString().split("T")[0] : "اختر"}
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

      {/* ====== PROJECTS ====== */}
      {projects.map((project) => {
        const b = projectBalances[project.id] ?? {
          cash: project.currentCash,
          bank: project.currentBank,
          loanBalance: 0,
        };
        return (
          <TouchableOpacity
            key={project.id}
            style={styles.card}
            onPress={() => router.push(`/project/${project.id}`)}
            onLongPress={() => handleEditProject(project)}
            activeOpacity={0.7}
          >
            <Text style={styles.cardTitle}>{project.name}</Text>
            <View style={styles.balanceRow}>
              <View style={styles.balanceBlock}>
                <Text style={styles.label}>الرصيد النقدي</Text>
                <Text style={styles.cashAmount}>{formatCurrency(b.cash)}</Text>
              </View>
              <View style={styles.balanceBlock}>
                <Text style={styles.label}>الرصيد البنكي</Text>
                <Text style={styles.bankAmount}>{formatCurrency(b.bank)}</Text>
              </View>
            </View>

            {/* Loan Balance Row */}
            <View style={styles.loanRow}>
              <Text style={styles.label}>صافي القروض</Text>
              <Text
                style={[
                  styles.loanAmount,
                  b.loanBalance >= 0
                    ? styles.positiveLoan
                    : styles.negativeLoan,
                ]}
              >
                {formatCurrency(b.loanBalance)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={(e) => {
                e.stopPropagation();
                openTransactionModal(project.id);
              }}
            >
              <Text style={styles.actionBtnText}>+ إضافة معاملة</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="اسم المشروع الجديد"
          value={newProjectName}
          onChangeText={setNewProjectName}
          textAlign="right"
        />
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleCreateProject}
        >
          <Text style={styles.primaryBtnText}>إنشاء مشروع</Text>
        </TouchableOpacity>
      </View>

      {/* Transaction Modal */}
      {selectedProjectId && (
        <AddTransactionBottomSheet
          projectId={selectedProjectId}
          visible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
        />
      )}

      {/* Edit Project Modal */}
      <Modal
        visible={!!editingProject}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingProject(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <Text style={styles.modalHeader}>العديل على المشروع </Text>
            <TextInput
              style={styles.input}
              placeholder="اسم المشروع"
              value={editName}
              onChangeText={setEditName}
              textAlign="right"
              autoFocus
            />
            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={saveEdit}
              >
                <Text style={styles.saveBtnText}>حفظ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setEditingProject(null);
                  setEditName("");
                }}
              >
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6", padding: 16 },
  headerContainer: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  editModalContent: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 20,
    margin: 24,
    marginTop: "auto",
    marginBottom: "auto",
  },
  editModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "right",
  },
  logo: {
    width: 45,
    height: 45,
    borderRadius: 10,
  },

  // ====== DATE FILTER STYLES ======
  filterCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterHeaderRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  filterPeriodLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  filterChipsScroll: {
    flexDirection: "row-reverse",
    gap: 8,
    paddingBottom: 2,
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  filterChipText: {
    color: "#4b5563",
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  customRangeRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 12,
    alignItems: "stretch",
  },
  dateBtn: {
    flex: 1,
    backgroundColor: "#f9fafb",
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

  // ====== CARDS ======
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
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "right",
  },
  balanceRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  balanceBlock: { flex: 1, alignItems: "flex-start" },
  label: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  cashAmount: { fontSize: 20, fontWeight: "bold", color: "#059669" },
  bankAmount: { fontSize: 20, fontWeight: "bold", color: "#2563eb" },
  loanRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  loanAmount: {
    fontSize: 18,
    fontWeight: "bold",
  },
  positiveLoan: { color: "#8B5CF6" },
  negativeLoan: { color: "#EF4444" },
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
    textAlign: "right",
    backgroundColor: "#fafafa",
  },
  primaryBtn: {
    backgroundColor: "#111827",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryBtnText: { color: "white", fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "right",
  },
  modalLabel: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 8,
    textAlign: "right",
    marginTop: 8,
  },
  row: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipActive: { backgroundColor: "#dbeafe", borderColor: "#3b82f6" },
  chipText: { color: "#4b5563", fontSize: 14 },
  chipTextActive: { color: "#1d4ed8", fontWeight: "bold" },
  modalBtn: { flex: 1, padding: 14, borderRadius: 8, alignItems: "center" },
  cancelBtn: { backgroundColor: "#f3f4f6", marginRight: 8 },
  cancelBtnText: { color: "#374151", fontWeight: "600" },
  saveBtn: { backgroundColor: "#111827" },
  saveBtnText: { color: "white", fontWeight: "600" },
  headerTextGroup: {
    alignItems: "flex-end",
  },
  dateText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 2,
  },
});
