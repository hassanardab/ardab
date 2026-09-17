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
import { Invoice, InvoiceItem, InvoiceType } from "../types";
import {
  formatNumberWithCommas,
  formatPhoneNumber,
  formatPriceInputDisplay,
  parseFormattedNumberWithDecimals,
  stripPhoneFormatting,
} from "../utils/format";

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

  const [type, setType] = useState<InvoiceType>("ARABIC_INV");
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | undefined>(undefined);
  const [customerName, setCustomerName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(""); // store raw digits
  const [address, setAddress] = useState("");
  const [date, setDate] = useState(new Date());
  const [companyAddress, setCompanyAddress] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: generateId(), item: "", description: "", quantity: 1, price: 0 },
  ]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);

  // For price inputs per item
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});

  // Load data when editing or opening
  useEffect(() => {
    if (visible) {
      setErrorMessage(null);
      if (invoiceToEdit) {
        setType(invoiceToEdit.type || "ARABIC_INV");
        setCompanyName(invoiceToEdit.companyName);
        setCompanyLogo(invoiceToEdit.companyLogo);
        setCompanyAddress(invoiceToEdit.companyAddress || "");
        setCustomerName(invoiceToEdit.customerName);
        setCompanyPhone(invoiceToEdit.companyPhone || "");
        setPhoneNumber(stripPhoneFormatting(invoiceToEdit.phoneNumber || ""));
        setAddress(invoiceToEdit.address || "");
        setDate(new Date(invoiceToEdit.date));
        const loadedItems = invoiceToEdit.items.map((item) => ({
          ...item,
          id: item.id || generateId(),
        }));
        setItems(loadedItems);
        const inputs: Record<string, string> = {};
        loadedItems.forEach((item) => {
          inputs[item.id] = String(item.price);
        });
        setPriceInputs(inputs);
        setTax(invoiceToEdit.tax);
        setDiscount(invoiceToEdit.discount);
      } else {
        // Reset for new invoice
        setType("ARABIC_INV");
        setCompanyName("");
        setCompanyLogo(undefined);
        setCustomerName("");
        setPhoneNumber("");
        setCompanyAddress("");
        setAddress("");
        setCompanyPhone("");
        setDate(new Date());
        const newItem = {
          id: generateId(),
          item: "",
          description: "",
          quantity: 1,
          price: 0,
        };
        setItems([newItem]);
        setPriceInputs({ [newItem.id]: "" });
        setTax(0);
        setDiscount(0);
      }
    }
  }, [visible, invoiceToEdit]);

  const handleSave = () => {
    // Phone number is now optional – only validate required fields
    if (
      !companyName.trim() ||
      !customerName.trim() ||
      !address.trim() ||
      items.some((i) => !i.item.trim() || i.quantity <= 0 || i.price < 0)
    ) {
      setErrorMessage("يرجى ملء جميع الحقول المطلوبة بشكل صحيح");
      return;
    }

    setErrorMessage(null);
    const rawPhone = phoneNumber.replace(/\D/g, ""); // still stored, but can be empty
    const invoiceData: Invoice = {
      id: invoiceToEdit?.id || generateId(),
      type,
      companyName: companyName.trim(),
      companyLogo,
      customerName: customerName.trim(),
      phoneNumber: rawPhone, // store only digits, may be empty
      address: address.trim(),
      date: date.toISOString(),
      companyPhone: companyPhone.trim() || undefined,
      companyAddress: companyAddress.trim() || undefined,
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
    const newItem = {
      id: generateId(),
      item: "",
      description: "",
      quantity: 1,
      price: 0,
    };
    setItems([...items, newItem]);
    setPriceInputs((prev) => ({ ...prev, [newItem.id]: "" }));
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter((item) => item.id !== id));
    setPriceInputs((prev) => {
      const newInputs = { ...prev };
      delete newInputs[id];
      return newInputs;
    });
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handlePriceChange = (id: string, text: string) => {
    setPriceInputs((prev) => ({ ...prev, [id]: text }));
    const num = parseFormattedNumberWithDecimals(text);
    if (!isNaN(num) && text !== "" && !text.endsWith(".")) {
      updateItem(id, "price", num);
    } else if (text === "" || text === "-") {
      updateItem(id, "price", 0);
    }
  };

  const handlePhoneChange = (text: string) => {
    // Keep only digits
    const digits = text.replace(/\D/g, "");
    setPhoneNumber(digits);
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

  // Display formatted phone
  const displayPhone = formatPhoneNumber(phoneNumber);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Sheet Handle */}
          <View style={styles.sheetHandleContainer}>
            <View style={styles.sheetHandle} />
          </View>

          {/* Top Bar */}
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeader}>
              {invoiceToEdit ? "تعديل الفاتورة" : "إضافة فاتورة جديدة"}
            </Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Validation Error Banner */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {/* Type Switcher */}
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  type === "ARABIC_INV" && styles.segmentBtnActive,
                ]}
                onPress={() => setType("ARABIC_INV")}
              >
                <Text
                  style={[
                    styles.segmentText,
                    type === "ARABIC_INV" && styles.segmentTextActive,
                  ]}
                >
                  بالعربي (Arabic)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  type === "ENGLISH_INV" && styles.segmentBtnActive,
                ]}
                onPress={() => setType("ENGLISH_INV")}
              >
                <Text
                  style={[
                    styles.segmentText,
                    type === "ENGLISH_INV" && styles.segmentTextActive,
                  ]}
                >
                  بالإنجليزية (English)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Company Logo Picker */}
            <Text style={styles.fieldLabel}>شعار الشركة</Text>
            <TouchableOpacity style={styles.logoPicker} onPress={pickImage}>
              {companyLogo ? (
                <View style={styles.logoPreviewContainer}>
                  <Image
                    source={{ uri: companyLogo }}
                    style={styles.logoImage}
                  />
                  <Text style={styles.changeLogoText}>تغيير الشعار</Text>
                </View>
              ) : (
                <View style={styles.logoPlaceholderContainer}>
                  <Text style={styles.uploadIcon}>📷</Text>
                  <Text style={styles.logoPlaceholder}>
                    اضغط لرفع شعار الشركة
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Primary Details Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>اسم الشركة</Text>
              <TextInput
                style={styles.input}
                placeholder="أدخل اسم الشركة"
                placeholderTextColor="#9CA3AF"
                value={companyName}
                onChangeText={setCompanyName}
                textAlign="right"
              />
            </View>

            {/* Company Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>رقم هاتف الشركة (اختياري)</Text>
              <TextInput
                style={styles.input}
                placeholder="أدخل رقم هاتف الشركة"
                placeholderTextColor="#9CA3AF"
                value={formatPhoneNumber(companyPhone)}
                onChangeText={(text) =>
                  setCompanyPhone(stripPhoneFormatting(text))
                }
                textAlign="right"
                keyboardType="phone-pad"
                maxLength={14}
              />
            </View>

            {/* Company Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>عنوان الشركة (اختياري)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="أدخل عنوان الشركة"
                placeholderTextColor="#9CA3AF"
                value={companyAddress}
                onChangeText={setCompanyAddress}
                textAlign="right"
                multiline
                numberOfLines={2}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>اسم العميل</Text>
              <TextInput
                style={styles.input}
                placeholder="أدخل اسم العميل"
                placeholderTextColor="#9CA3AF"
                value={customerName}
                onChangeText={setCustomerName}
                textAlign="right"
              />
            </View>

            {/* Phone Input – now optional */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>رقم الهاتف (اختياري)</Text>
              <TextInput
                style={styles.input}
                placeholder="(XXX) XXX-XXXX"
                placeholderTextColor="#9CA3AF"
                value={displayPhone}
                onChangeText={handlePhoneChange}
                textAlign="right"
                keyboardType="phone-pad"
                maxLength={14}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>العنوان *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="أدخل العنوان"
                placeholderTextColor="#9CA3AF"
                value={address}
                onChangeText={setAddress}
                textAlign="right"
                multiline
                numberOfLines={2}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>تاريخ الفاتورة</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateIcon}>📅</Text>
                <Text style={styles.dateText}>
                  {date.toISOString().split("T")[0]}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}

            {/* Items Section */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>بنود الفاتورة</Text>
              <Text style={styles.itemCountBadge}>{items.length} بنود</Text>
            </View>

            {items.map((item, index) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <TouchableOpacity
                    style={styles.removeItemBtn}
                    onPress={() => removeItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <Text
                      style={[
                        styles.removeItemBtnText,
                        items.length === 1 && styles.disabledRemoveBtn,
                      ]}
                    >
                      حذف البند
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.itemCardTitle}>بند #{index + 1}</Text>
                </View>

                <TextInput
                  style={[styles.input, styles.itemInput]}
                  placeholder="رقم القطعة"
                  placeholderTextColor="#9CA3AF"
                  value={item.item}
                  onChangeText={(val) => updateItem(item.id, "item", val)}
                  textAlign="right"
                />

                <TextInput
                  style={[styles.input, styles.itemInput]}
                  placeholder="الوصف التفصيلي (اختياري)"
                  placeholderTextColor="#9CA3AF"
                  value={item.description}
                  onChangeText={(val) =>
                    updateItem(item.id, "description", val)
                  }
                  textAlign="right"
                />

                <View style={styles.itemNumbersRow}>
                  <View style={styles.flexInputContainer}>
                    <Text style={styles.subFieldLabel}>السعر</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="decimal-pad"
                      value={formatPriceInputDisplay(
                        priceInputs[item.id] ?? "",
                      )}
                      onChangeText={(text) => handlePriceChange(item.id, text)}
                      textAlign="right"
                    />
                  </View>

                  <View style={styles.flexInputContainer}>
                    <Text style={styles.subFieldLabel}>الكمية</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="1"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      value={String(item.quantity)}
                      onChangeText={(val) =>
                        updateItem(item.id, "quantity", Number(val) || 0)
                      }
                      textAlign="right"
                    />
                  </View>
                </View>

                <View style={styles.lineTotalRow}>
                  <Text style={styles.lineTotalVal}>
                    {formatNumberWithCommas(item.quantity * item.price)}
                  </Text>
                  <Text style={styles.lineTotalLabel}>الإجمالي الجزئي:</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
              <Text style={styles.addItemBtnText}>+ إضافة بند جديد</Text>
            </TouchableOpacity>

            {/* Calculations & Totals Card */}
            <View style={styles.calculationCard}>
              <View style={styles.totalsInputRow}>
                <View style={styles.totalsInputGroup}>
                  <Text style={styles.subFieldLabel}>الخصم (%)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={String(discount)}
                    onChangeText={(val) => setDiscount(Number(val) || 0)}
                    textAlign="center"
                  />
                </View>

                <View style={styles.totalsInputGroup}>
                  <Text style={styles.subFieldLabel}>الضريبة (%)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={String(tax)}
                    onChangeText={(val) => setTax(Number(val) || 0)}
                    textAlign="center"
                  />
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryValue}>
                  {formatNumberWithCommas(subtotal)}
                </Text>
                <Text style={styles.summaryLabel}>المجموع الفرعي</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryValue}>
                  {formatNumberWithCommas(taxAmount)}
                </Text>
                <Text style={styles.summaryLabel}>قيمة الضريبة</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryValue}>
                  -{formatNumberWithCommas(discountAmount)}
                </Text>
                <Text style={styles.summaryLabel}>قيمة الخصم</Text>
              </View>

              <View style={styles.totalRowContainer}>
                <Text style={styles.totalValue}>
                  {formatNumberWithCommas(total)}
                </Text>
                <Text style={styles.totalLabel}>المبلغ الإجمالي</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>
                  {invoiceToEdit ? "حفظ التعديلات" : "إنشاء الفاتورة"}
                </Text>
              </TouchableOpacity>

              {invoiceToEdit && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={handleDelete}
                >
                  <Text style={styles.deleteBtnText}>حذف الفاتورة</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // ... (keep all your existing styles exactly as they were)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetHandleContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "right",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "bold",
  },
  scrollContent: {
    paddingVertical: 16,
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  segmentTextActive: {
    color: "#0F172A",
    fontWeight: "700",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
    textAlign: "right",
  },
  subFieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 4,
    textAlign: "right",
  },
  inputGroup: {
    marginBottom: 14,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  logoPicker: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    marginBottom: 16,
  },
  logoPlaceholderContainer: {
    alignItems: "center",
  },
  uploadIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  logoPlaceholder: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "500",
  },
  logoPreviewContainer: {
    alignItems: "center",
  },
  logoImage: {
    width: 90,
    height: 60,
    borderRadius: 8,
    resizeMode: "contain",
  },
  changeLogoText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
    marginTop: 6,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateIcon: {
    fontSize: 16,
  },
  dateText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "500",
  },
  sectionHeaderRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  itemCountBadge: {
    backgroundColor: "#E2E8F0",
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  itemCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  removeItemBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeItemBtnText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
  },
  disabledRemoveBtn: {
    color: "#CBD5E1",
  },
  itemInput: {
    marginBottom: 10,
  },
  itemNumbersRow: {
    flexDirection: "row",
    gap: 10,
  },
  flexInputContainer: {
    flex: 1,
  },
  lineTotalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  lineTotalLabel: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 4,
  },
  lineTotalVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  addItemBtn: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 4,
    marginBottom: 18,
  },
  addItemBtnText: {
    color: "#1E293B",
    fontWeight: "600",
    fontSize: 14,
  },
  calculationCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  totalsInputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  totalsInputGroup: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  summaryValue: {
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "600",
  },
  totalRowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#38BDF8",
  },
  actionContainer: {
    gap: 10,
  },
  saveBtn: {
    backgroundColor: "#0F172A",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  deleteBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteBtnText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: "top",
    paddingTop: 12,
  },
});
