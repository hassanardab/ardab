import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useStore } from "../store/useStore";
import { PaymentMethod, Transaction, TransactionType } from "../types";
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
  const { addTransaction, updateTransaction } = useStore();
  const [txType, setTxType] = useState<TransactionType>("EXPENSE");
  const [txMethod, setTxMethod] = useState<PaymentMethod>("CASH");
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");

  const [txDate, setTxDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
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
        setTxType("EXPENSE");
        setTxMethod("CASH");
      }
    }
  }, [visible, transactionToEdit]);

  const handleSave = () => {
    const amountNum = parseFormattedNumber(txAmount);
    if (!amountNum || isNaN(amountNum)) return;

    const transactionData = {
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

    setTxAmount("");
    setTxDesc("");
    setTxDate(new Date());
    setTxType("EXPENSE");
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

          <Text style={styles.modalLabel}>نوع المعاملة</Text>
          <View style={styles.row}>
            {["EXPENSE", "INCOME", "PAYROLL", "BILL", "TRANSFER"].map(
              (type) => (
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
                          : type === "BILL"
                            ? "فاتورة"
                            : "تحويل"}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>

          <Text style={styles.modalLabel}>
            {txType === "TRANSFER" ? "تحويل إلى" : "طريقة الدفع"}
          </Text>
          <View style={styles.row}>
            {["CASH", "BANK"].map((method) => (
              <TouchableOpacity
                key={method}
                style={[styles.chip, txMethod === method && styles.chipActive]}
                onPress={() => setTxMethod(method as PaymentMethod)}
              >
                <Text
                  style={[
                    styles.chipText,
                    txMethod === method && styles.chipTextActive,
                  ]}
                >
                  {method === "CASH"
                    ? txType === "TRANSFER"
                      ? "الصندوق (سحب من البنك)"
                      : "نقدي"
                    : txType === "TRANSFER"
                      ? "البنك (إيداع نقدي)"
                      : "بنكي"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="المبلغ"
            keyboardType="numeric"
            value={txAmount}
            onChangeText={(text) => setTxAmount(formatNumberInput(text))}
            textAlign="right"
          />
          <TextInput
            style={styles.input}
            placeholder="الوصف (مواد، مورد، الخ)"
            value={txDesc}
            onChangeText={setTxDesc}
            textAlign="right"
          />

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
  chipActive: { backgroundColor: "#dbeafe", borderColor: "#3b82f6" },
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
