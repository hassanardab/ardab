import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useStore } from "../store/useStore";
import { PaymentMethod, TransactionType } from "../types";
import { formatCurrency } from "../utils/format";

export default function DashboardScreen() {
  const router = useRouter();
  const { projects, addProject, addTransaction } = useStore();
  const [newProjectName, setNewProjectName] = useState("");

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [txType, setTxType] = useState<TransactionType>("EXPENSE");
  const [txMethod, setTxMethod] = useState<PaymentMethod>("CASH");
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");

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

  const openTransactionModal = (projectId: string) => {
    setSelectedProjectId(projectId);
    setIsModalVisible(true);
    setTxAmount("");
    setTxDesc("");
  };

  const handleAddTransaction = () => {
    const amountNum = Number(txAmount.replace(/,/g, ""));
    if (!selectedProjectId || !amountNum || isNaN(amountNum)) return;

    addTransaction({
      id: Date.now().toString(),
      projectId: selectedProjectId,
      type: txType,
      method: txMethod,
      amount: amountNum,
      description: txDesc || "بدون وصف",
      date: new Date().toISOString(),
    });
    setIsModalVisible(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>المشاريع النشطة</Text>

      {projects.map((project) => (
        <TouchableOpacity
          key={project.id}
          style={styles.card}
          onPress={() => router.push(`/project/${project.id}`)}
          activeOpacity={0.7}
        >
          <Text style={styles.cardTitle}>{project.name}</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceBlock}>
              <Text style={styles.label}>الرصيد النقدي</Text>
              <Text style={styles.cashAmount}>
                ${formatCurrency(project.currentCash)}
              </Text>
            </View>
            <View style={styles.balanceBlock}>
              <Text style={styles.label}>الرصيد البنكي</Text>
              <Text style={styles.bankAmount}>
                ${formatCurrency(project.currentBank)}
              </Text>
            </View>
          </View>

          {/* We intercept the button press so it doesn't trigger the card's navigation */}
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
      ))}

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

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>إضافة معاملة جديدة</Text>

            <Text style={styles.modalLabel}>نوع المعاملة</Text>
            <View style={styles.row}>
              {["EXPENSE", "INCOME", "PAYROLL", "BILL"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, txType === type && styles.chipActive]}
                  onPress={() => setTxType(type as TransactionType)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      txType === type && styles.chipTextActive,
                    ]}
                  >
                    {type === "INCOME"
                      ? "دخل"
                      : type === "EXPENSE"
                        ? "مصروف"
                        : type === "PAYROLL"
                          ? "رواتب"
                          : "فاتورة"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>طريقة الدفع</Text>
            <View style={styles.row}>
              {["CASH", "BANK"].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.chip,
                    txMethod === method && styles.chipActive,
                  ]}
                  onPress={() => setTxMethod(method as PaymentMethod)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      txMethod === method && styles.chipTextActive,
                    ]}
                  >
                    {method === "CASH" ? "نقدي" : "بنكي"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="المبلغ"
              keyboardType="numeric"
              value={txAmount}
              onChangeText={setTxAmount}
              textAlign="right"
            />
            <TextInput
              style={styles.input}
              placeholder="الوصف (مواد، مورد، الخ)"
              value={txDesc}
              onChangeText={setTxDesc}
              textAlign="right"
            />

            <View style={[styles.row, { marginTop: 16 }]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleAddTransaction}
              >
                <Text style={styles.saveBtnText}>حفظ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    textAlign: "right",
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
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "right",
  },
  balanceRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  balanceBlock: { flex: 1, alignItems: "flex-start" },
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
});
