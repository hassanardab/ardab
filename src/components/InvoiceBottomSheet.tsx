// src/components/InvoiceBottomSheet.tsx
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  Image,
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
import { Invoice, InvoiceItem } from "../types";

interface Props {
  visible: boolean;
  onClose: () => void;
  invoiceToEdit?: Invoice | null;
}

const generateId = () =>
  Date.now().toString() + Math.random().toString(36).substring(2, 6);

export default function InvoiceBottomSheet({
  visible,
  onClose,
  invoiceToEdit,
}: Props) {
  const { addInvoice, updateInvoice, deleteInvoice } = useStore();

  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | undefined>(undefined);
  const [customerName, setCustomerName] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: generateId(), item: "", description: "", quantity: 1, price: 0 },
  ]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);

  // Load data when editing
  useEffect(() => {
    if (visible) {
      if (invoiceToEdit) {
        setCompanyName(invoiceToEdit.companyName);
        setCompanyLogo(invoiceToEdit.companyLogo);
        setCustomerName(invoiceToEdit.customerName);
        setDate(new Date(invoiceToEdit.date));
        setItems(
          invoiceToEdit.items.map((item) => ({
            ...item,
            id: item.id || generateId(),
          })),
        );
        setTax(invoiceToEdit.tax);
        setDiscount(invoiceToEdit.discount);
      } else {
        // Reset for new invoice
        setCompanyName("");
        setCompanyLogo(undefined);
        setCustomerName("");
        setDate(new Date());
        setItems([
          {
            id: generateId(),
            item: "",
            description: "",
            quantity: 1,
            price: 0,
          },
        ]);
        setTax(0);
        setDiscount(0);
      }
    }
  }, [visible, invoiceToEdit]);

  const handleSave = () => {
    if (
      !companyName.trim() ||
      !customerName.trim() ||
      items.some((i) => !i.item.trim() || i.quantity <= 0 || i.price < 0)
    ) {
      alert("يرجى ملء جميع الحقول المطلوبة بشكل صحيح");
      return;
    }

    const invoiceData: Invoice = {
      id: invoiceToEdit?.id || generateId(),
      companyName: companyName.trim(),
      companyLogo,
      customerName: customerName.trim(),
      date: date.toISOString(),
      items: items.map((item) => ({
        ...item,
        id: item.id || generateId(),
      })),
      tax: tax || 0,
      discount: discount || 0,
    };

    if (invoiceToEdit) {
      updateInvoice(invoiceData.id, invoiceData);
    } else {
      addInvoice(invoiceData);
    }
    onClose();
  };

  const handleDelete = () => {
    if (invoiceToEdit) {
      deleteInvoice(invoiceToEdit.id);
      onClose();
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setCompanyLogo(result.assets[0].uri);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: generateId(), item: "", description: "", quantity: 1, price: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const computeSubtotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };
  const subtotal = computeSubtotal();
  const taxAmount = (subtotal * tax) / 100;
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal + taxAmount - discountAmount;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <Text style={styles.modalHeader}>
              {invoiceToEdit ? "تعديل الفاتورة" : "إضافة فاتورة جديدة"}
            </Text>

            {/* Company Logo */}
            <TouchableOpacity style={styles.logoPicker} onPress={pickImage}>
              {companyLogo ? (
                <Image source={{ uri: companyLogo }} style={styles.logoImage} />
              ) : (
                <Text style={styles.logoPlaceholder}>رفع شعار الشركة</Text>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="اسم الشركة"
              value={companyName}
              onChangeText={setCompanyName}
              textAlign="right"
            />
            <TextInput
              style={styles.input}
              placeholder="اسم العميل"
              value={customerName}
              onChangeText={setCustomerName}
              textAlign="right"
            />

            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {date.toISOString().split("T")[0]}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}

            <Text style={styles.sectionTitle}>البنود</Text>
            {items.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemFields}>
                  <TextInput
                    style={[styles.input, styles.itemInput]}
                    placeholder="الصنف"
                    value={item.item}
                    onChangeText={(val) => updateItem(item.id, "item", val)}
                    textAlign="right"
                  />
                  <TextInput
                    style={[styles.input, styles.itemInput]}
                    placeholder="الوصف (اختياري)"
                    value={item.description}
                    onChangeText={(val) =>
                      updateItem(item.id, "description", val)
                    }
                    textAlign="right"
                  />
                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, styles.smallInput]}
                      placeholder="الكمية"
                      keyboardType="numeric"
                      value={String(item.quantity)}
                      onChangeText={(val) =>
                        updateItem(item.id, "quantity", Number(val) || 0)
                      }
                      textAlign="right"
                    />
                    <TextInput
                      style={[styles.input, styles.smallInput]}
                      placeholder="السعر"
                      keyboardType="numeric"
                      value={String(item.price)}
                      onChangeText={(val) =>
                        updateItem(item.id, "price", Number(val) || 0)
                      }
                      textAlign="right"
                    />
                    <TouchableOpacity
                      style={styles.removeItemBtn}
                      onPress={() => removeItem(item.id)}
                    >
                      <Text style={styles.removeItemBtnText}>×</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
              <Text style={styles.addItemBtnText}>+ إضافة بند</Text>
            </TouchableOpacity>

            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>الضريبة (%)</Text>
              <TextInput
                style={[styles.input, styles.totalsInput]}
                keyboardType="numeric"
                value={String(tax)}
                onChangeText={(val) => setTax(Number(val) || 0)}
                textAlign="right"
              />
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>الخصم (%)</Text>
              <TextInput
                style={[styles.input, styles.totalsInput]}
                keyboardType="numeric"
                value={String(discount)}
                onChangeText={(val) => setDiscount(Number(val) || 0)}
                textAlign="right"
              />
            </View>

            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                المجموع الفرعي: {subtotal.toFixed(2)}
              </Text>
              <Text style={styles.summaryText}>
                الضريبة: {taxAmount.toFixed(2)}
              </Text>
              <Text style={styles.summaryText}>
                الخصم: {discountAmount.toFixed(2)}
              </Text>
              <Text style={[styles.summaryText, styles.totalText]}>
                الإجمالي: {total.toFixed(2)}
              </Text>
            </View>

            <View style={[styles.row, { marginTop: 16 }]}>
              {invoiceToEdit && (
                <TouchableOpacity
                  style={[styles.modalBtn, styles.deleteBtn]}
                  onPress={handleDelete}
                >
                  <Text style={styles.deleteBtnText}>حذف</Text>
                </TouchableOpacity>
              )}
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
  logoPicker: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    resizeMode: "contain",
  },
  logoPlaceholder: {
    color: "#6b7280",
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginVertical: 8,
    textAlign: "right",
  },
  itemRow: {
    marginBottom: 12,
  },
  itemFields: {
    backgroundColor: "#f9fafb",
    padding: 8,
    borderRadius: 8,
  },
  itemInput: {
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  smallInput: {
    flex: 1,
    marginRight: 4,
  },
  removeItemBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },
  removeItemBtnText: {
    color: "#dc2626",
    fontSize: 18,
    fontWeight: "bold",
  },
  addItemBtn: {
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 8,
  },
  addItemBtnText: {
    color: "#374151",
    fontWeight: "500",
  },
  totalsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  totalsLabel: {
    fontSize: 14,
    color: "#4b5563",
    marginRight: 8,
  },
  totalsInput: {
    width: 80,
    textAlign: "right",
  },
  summary: {
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  summaryText: {
    fontSize: 14,
    textAlign: "right",
    marginVertical: 2,
  },
  totalText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  cancelBtn: {
    backgroundColor: "#f3f4f6",
  },
  cancelBtnText: {
    color: "#374151",
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: "#111827",
  },
  saveBtnText: {
    color: "white",
    fontWeight: "600",
  },
  deleteBtn: {
    backgroundColor: "#dc2626",
  },
  deleteBtnText: {
    color: "white",
    fontWeight: "600",
  },
});
