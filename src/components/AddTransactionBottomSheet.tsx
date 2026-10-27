import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { PaymentMethod, Transaction } from "../types";
import { formatNumberInput, parseFormattedNumber } from "../utils/format";

interface Props {
  projectId: string;
  visible: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
}

export default function AddTransactionBottomSheet({
  projectId,
  visible,
  onClose,
  transactionToEdit,
}: Props) {
  const { addTransaction, updateTransaction, projects } = useStore();
  const amountInputRef = useRef<TextInput>(null);

  const project = projects.find((p) => p.id === projectId);

  // Active (non-archived) types for the picker.
  const activeTypes = useMemo(
    () => (project?.transactionTypes ?? []).filter((t) => !t.archived),
    [project],
  );

  // If the transaction being edited references an archived type, we still
  // want it visible so the user isn't confused by the selection vanishing.
  const archivedEditingType = useMemo(() => {
    if (!transactionToEdit || !project) return undefined;
    const def = project.transactionTypes.find(
      (t) => t.id === transactionToEdit.type,
    );
    return def?.archived ? def : undefined;
  }, [transactionToEdit, project]);

  const visibleTypes = useMemo(() => {
    if (!archivedEditingType) return activeTypes;
    return [archivedEditingType, ...activeTypes];
  }, [activeTypes, archivedEditingType]);

  const [txType, setTxType] = useState<string>("EXPENSE");
  const [txMethod, setTxMethod] = useState<PaymentMethod>("BANK");
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");

  const [txDate, setTxDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Seed the form when the modal opens.
  useEffect(() => {
    if (!visible) return;

    if (transactionToEdit) {
      setTxType(transactionToEdit.type);
      setTxMethod(transactionToEdit.method);
      setTxAmount(formatNumberInput(transactionToEdit.amount.toString()));
      setTxDesc(transactionToEdit.description);
      setTxDate(new Date(transactionToEdit.date));
    } else {
      setTxAmount("");
      setTxDesc("");
      setTxDate(new Date());
      // Use the first active type; fall back to the legacy default if the
      // user archived everything (shouldn't happen, but keeps us safe).
      setTxType(activeTypes[0]?.id ?? "EXPENSE");
      setTxMethod("BANK");
    }

    const timeout = setTimeout(() => {
      amountInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, transactionToEdit]);

  const handleSave = () => {
    const amountNum = parseFormattedNumber(txAmount);
    if (!amountNum || isNaN(amountNum)) return;

    const transactionData: Transaction = {
      id: transactionToEdit ? transactionToEdit.id : Date.now().toString(),
      projectId,
      type: txType,
      method: txMethod,
      amount: amountNum,
      description:
        txDesc || (txType === "TRANSFER" ? "تحويل داخلي" : "بدون وصف"),
      date: txDate.toISOString(),
    };

    if (transactionToEdit) {
      updateTransaction(transactionData);
    } else {
      addTransaction(transactionData);
    }

    // Reset local state
    setTxAmount("");
    setTxDesc("");
    setTxDate(new Date());
    setTxType(activeTypes[0]?.id ?? "EXPENSE");
    setTxMethod("CASH");
    setShowDatePicker(false);
    onClose();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setTxDate(selectedDate);
    }
  };

  const isTransfer = txType === "TRANSFER";

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalHeader}>
            {transactionToEdit ? "تعديل المعاملة" : "إضافة معاملة جديدة"}
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ---------- TYPE PICKER (driven by project.transactionTypes) ---------- */}
            <Text style={styles.modalLabel}>نوع المعاملة</Text>
            <View style={styles.row}>
              {visibleTypes.length === 0 && (
                <Text style={styles.emptyTypesText}>
                  لا توجد أنواع متاحة لهذا المشروع. أضف نوعاً من إعدادات
                  المشروع.
                </Text>
              )}
              {visibleTypes.map((def) => {
                const isActive = txType === def.id;
                return (
                  <TouchableOpacity
                    key={def.id}
                    style={[
                      styles.chip,
                      isActive && {
                        backgroundColor: `${def.color}22`, // ~13% tint
                        borderColor: def.color,
                      },
                      isActive && styles.chipActiveOutline,
                    ]}
                    onPress={() => setTxType(def.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isActive && { color: def.color, fontWeight: "bold" },
                      ]}
                    >
                      {def.label}
                      {def.archived ? "  (مؤرشف)" : ""}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ---------- METHOD PICKER ---------- */}
            <Text style={styles.modalLabel}>
              {isTransfer ? "تحويل إلى" : "طريقة الدفع"}
            </Text>
            <View style={styles.row}>
              {(["CASH", "BANK"] as PaymentMethod[]).map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.chip,
                    txMethod === method && styles.chipActive,
                  ]}
                  onPress={() => setTxMethod(method)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      txMethod === method && styles.chipTextActive,
                    ]}
                  >
                    {method === "CASH"
                      ? isTransfer
                        ? "الصندوق (سحب من البنك)"
                        : "نقدي"
                      : isTransfer
                        ? "البنك (إيداع نقدي)"
                        : "بنكي"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ---------- AMOUNT ---------- */}
            <TextInput
              ref={amountInputRef}
              style={styles.input}
              placeholder="المبلغ"
              keyboardType="numeric"
              value={txAmount}
              onChangeText={(text) => setTxAmount(formatNumberInput(text))}
              textAlign="right"
            />

            {/* ---------- DESCRIPTION ---------- */}
            <TextInput
              style={styles.input}
              placeholder="الوصف (مواد، مورد، الخ)"
              value={txDesc}
              onChangeText={setTxDesc}
              textAlign="right"
            />

            {/* ---------- DATE ---------- */}
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {txDate.toISOString().split("T")[0]}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={txDate}
                  mode="date"
                  display="default"
                  onValueChange={handleDateChange}
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.doneButtonText}>تم</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ---------- ACTIONS ---------- */}
            <View style={[styles.row, { marginTop: 16 }]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSave}
              >
                <Text style={styles.saveBtnText}>حفظ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={onClose}
              >
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: "90%",
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
  emptyTypesText: {
    color: "#9CA3AF",
    fontSize: 13,
    textAlign: "right",
    flex: 1,
  },
  datePickerContainer: {
    alignItems: "center",
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
  // Kept from the original so the method picker still highlights.
  chipActive: { backgroundColor: "#dbeafe", borderColor: "#3b82f6" },
  // Additional outline used by the type picker when a colored type is active.
  chipActiveOutline: { borderWidth: 1.5 },
  chipText: { color: "#4b5563", fontSize: 14 },
  chipTextActive: { color: "#1d4ed8", fontWeight: "bold" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    textAlign: "right",
    backgroundColor: "#fafafa",
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#fafafa",
    justifyContent: "center",
  },
  dateText: {
    textAlign: "right",
    color: "#111827",
    fontSize: 14,
  },
  doneButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    alignSelf: "stretch",
    alignItems: "center",
  },
  doneButtonText: {
    color: "#1d4ed8",
    fontWeight: "bold",
  },
  modalBtn: { flex: 1, padding: 14, borderRadius: 8, alignItems: "center" },
  cancelBtn: { backgroundColor: "#f3f4f6", marginRight: 8 },
  cancelBtnText: { color: "#374151", fontWeight: "600" },
  saveBtn: { backgroundColor: "#111827" },
  saveBtnText: { color: "white", fontWeight: "600" },
});
