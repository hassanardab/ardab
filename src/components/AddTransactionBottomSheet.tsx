// src/components/AddTransactionBottomSheet.tsx
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Contacts from "expo-contacts/legacy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
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
import {
  LoanPerson,
  PaymentMethod,
  Transaction,
  TransactionDirection,
  TransactionTypeDef,
} from "../types";
import { formatNumberInput, parseFormattedNumber } from "../utils/format";

interface Props {
  projectId: string;
  visible: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
}

const GROUP_META: Record<
  TransactionDirection,
  { label: string; hint: string; accent: string }
> = {
  OUTFLOW: { label: "المصروفات", hint: "تقلل الرصيد", accent: "#EF4444" },
  INFLOW: { label: "الإيرادات", hint: "تزيد الرصيد", accent: "#10B981" },
  NEUTRAL: {
    label: "معاملات محايدة",
    hint: "لا تؤثر على الرصيد",
    accent: "#2563EB",
  },
};

const GROUP_ORDER: TransactionDirection[] = ["OUTFLOW", "INFLOW", "NEUTRAL"];

const isLoanType = (def: TransactionTypeDef | undefined): boolean =>
  !!(def?.countsAsLoanGiven || def?.countsAsLoanReceived);

type ContactCard = {
  id: string;
  name: string;
  phone?: string;
};

type ContactsStatus = "idle" | "loading" | "granted" | "denied" | "error";

export default function AddTransactionBottomSheet({
  projectId,
  visible,
  onClose,
  transactionToEdit,
}: Props) {
  const { addTransaction, updateTransaction, projects } = useStore();
  const amountInputRef = useRef<TextInput>(null);

  const project = projects.find((p) => p.id === projectId);

  const activeTypes = useMemo(
    () => (project?.transactionTypes ?? []).filter((t) => !t.archived),
    [project],
  );

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

  const groupedTypes = useMemo(() => {
    const groups: Record<TransactionDirection, TransactionTypeDef[]> = {
      OUTFLOW: [],
      INFLOW: [],
      NEUTRAL: [],
    };
    visibleTypes.forEach((def) => {
      const key: TransactionDirection =
        def.direction === "INFLOW" || def.direction === "OUTFLOW"
          ? def.direction
          : "NEUTRAL";
      groups[key].push(def);
    });
    return groups;
  }, [visibleTypes]);

  const defaultTypeId = useMemo(
    () =>
      activeTypes.find((t) => t.direction === "OUTFLOW")?.id ??
      activeTypes.find((t) => t.direction === "INFLOW")?.id ??
      activeTypes[0]?.id ??
      "EXPENSE",
    [activeTypes],
  );

  const [txType, setTxType] = useState<string>("EXPENSE");
  const [txMethod, setTxMethod] = useState<PaymentMethod>("BANK");
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [txDate, setTxDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [person, setPerson] = useState<LoanPerson | null>(null);
  // Toggles between the transaction form and the inline person picker.
  const [personPickerOpen, setPersonPickerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ---------- Person picker state ----------
  const [contacts, setContacts] = useState<ContactCard[]>([]);
  const [contactsStatus, setContactsStatus] = useState<ContactsStatus>("idle");
  const [contactSearch, setContactSearch] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  const currentTypeDef = useMemo(
    () => (project?.transactionTypes ?? []).find((t) => t.id === txType),
    [project, txType],
  );
  const loanType = isLoanType(currentTypeDef);

  // ---------- Contact loading (lazy, only when picker opens) ----------
  const loadContacts = useCallback(async () => {
    try {
      setContactsStatus("loading");

      let permission = await Contacts.getPermissionsAsync();
      if (permission.status !== "granted") {
        permission = await Contacts.requestPermissionsAsync();
      }

      if (permission.status !== "granted") {
        setContacts([]);
        setContactsStatus("denied");
        return;
      }

      const result = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
          Contacts.Fields.PhoneNumbers,
        ],
        sort: Contacts.SortTypes.FirstName,
        pageSize: 1000,
        pageOffset: 0,
      });

      const formatted = result.data
        .reduce<ContactCard[]>((acc, contact) => {
          const firstName = contact.firstName?.trim() ?? "";
          const lastName = contact.lastName?.trim() ?? "";
          const name =
            contact.name?.trim() || `${firstName} ${lastName}`.trim();
          const phone = contact.phoneNumbers
            ?.find((item) => item.number?.trim())
            ?.number?.trim();

          if (!name && !phone) return acc;

          acc.push({
            id: contact.id ?? `${name}-${phone ?? `${firstName}-${lastName}`}`,
            name: name || phone || "Unknown contact",
            phone,
          });
          return acc;
        }, [])
        .sort((a, b) => a.name.localeCompare(b.name));

      setContacts(formatted);
      setContactsStatus("granted");
    } catch (error) {
      console.error("[Contacts] Loading failed:", error);
      setContacts([]);
      setContactsStatus("error");
    }
  }, []);

  useEffect(() => {
    if (personPickerOpen && contactsStatus === "idle") {
      loadContacts();
    }
  }, [personPickerOpen, contactsStatus, loadContacts]);

  // ---------- Reset / hydrate on open ----------
  useEffect(() => {
    if (!visible) return;

    if (transactionToEdit) {
      setTxType(transactionToEdit.type);
      setTxMethod(transactionToEdit.method);
      setTxAmount(formatNumberInput(transactionToEdit.amount.toString()));
      setTxDesc(transactionToEdit.description);
      setTxDate(new Date(transactionToEdit.date));
      setPerson(transactionToEdit.person ?? null);
    } else {
      setTxAmount("");
      setTxDesc("");
      setTxDate(new Date());
      setTxType(defaultTypeId);
      setTxMethod("BANK");
      setPerson(null);
    }
    setErrorMessage(null);
    setPersonPickerOpen(false);
    setContactSearch("");
    setManualName("");
    setManualPhone("");

    const timeout = setTimeout(() => {
      amountInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, transactionToEdit]);

  useEffect(() => {
    if (!loanType) {
      setPerson(null);
      setPersonPickerOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanType]);

  // ---------- Filtered contact list ----------
  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ? c.phone.toLowerCase().includes(q) : false),
    );
  }, [contacts, contactSearch]);

  const pickContact = (contact: ContactCard) => {
    setPerson({
      id: `c:${contact.id}`,
      name: contact.name,
      phone: contact.phone,
    });
    setPersonPickerOpen(false);
    setContactSearch("");
  };

  const addManualPerson = () => {
    const name = manualName.trim();
    if (!name) return;
    setPerson({
      id: `m:${Date.now().toString(36)}`,
      name,
      phone: manualPhone.trim() || undefined,
    });
    setManualName("");
    setManualPhone("");
    setPersonPickerOpen(false);
  };

  const handleSave = () => {
    const amountNum = parseFormattedNumber(txAmount);
    if (!amountNum || isNaN(amountNum)) {
      setErrorMessage("يرجى إدخال مبلغ صحيح.");
      return;
    }

    if (loanType && !person && !txDesc.trim()) {
      setErrorMessage("يرجى اختيار الشخص أو كتابة ملاحظة.");
      return;
    }

    const fallbackDesc = loanType
      ? ""
      : txType === "TRANSFER"
        ? "تحويل داخلي"
        : "بدون وصف";

    const transactionData: Transaction = {
      id: transactionToEdit ? transactionToEdit.id : Date.now().toString(),
      projectId,
      type: txType,
      method: txMethod,
      amount: amountNum,
      description: txDesc || fallbackDesc,
      date: txDate.toISOString(),
      person: loanType && person ? person : undefined,
    };

    if (transactionToEdit) {
      updateTransaction(transactionData);
    } else {
      addTransaction(transactionData);
    }

    setTxAmount("");
    setTxDesc("");
    setTxDate(new Date());
    setTxType(defaultTypeId);
    setTxMethod("CASH");
    setPerson(null);
    setShowDatePicker(false);
    setErrorMessage(null);
    setPersonPickerOpen(false);
    onClose();
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) setTxDate(selectedDate);
  };

  const isTransfer = txType === "TRANSFER";
  const hasAnyType = visibleTypes.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => {
        // Back button: from picker, return to form. From form, close.
        if (personPickerOpen) setPersonPickerOpen(false);
        else onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header: only shown in form mode — the picker renders its own. */}
          {!personPickerOpen && (
            <Text style={styles.modalHeader}>
              {transactionToEdit ? "تعديل المعاملة" : "إضافة معاملة جديدة"}
            </Text>
          )}

          {/* ---------- FORM VIEW ---------- */}
          {!personPickerOpen && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              <Text style={styles.modalLabel}>نوع المعاملة</Text>

              {!hasAnyType && (
                <Text style={styles.emptyTypesText}>
                  لا توجد أنواع متاحة لهذا المشروع. أضف نوعاً من إعدادات
                  المشروع.
                </Text>
              )}

              {GROUP_ORDER.map((group) => {
                const items = groupedTypes[group];
                if (items.length === 0) return null;
                const meta = GROUP_META[group];

                return (
                  <View key={group} style={styles.groupContainer}>
                    <View style={styles.groupHeader}>
                      <View
                        style={[
                          styles.groupAccentBar,
                          { backgroundColor: meta.accent },
                        ]}
                      />
                      <Text style={styles.groupLabel}>{meta.label}</Text>
                      <Text style={styles.groupHint}>{meta.hint}</Text>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipRowContent}
                      keyboardShouldPersistTaps="handled"
                    >
                      {items.map((def) => {
                        const isActive = txType === def.id;
                        const isTransferType = def.id === "TRANSFER";
                        const isLoan = isLoanType(def);
                        return (
                          <TouchableOpacity
                            key={def.id}
                            style={[
                              styles.chip,
                              isActive && {
                                backgroundColor: `${def.color}22`,
                                borderColor: def.color,
                                borderWidth: 1.5,
                              },
                            ]}
                            onPress={() => setTxType(def.id)}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                styles.chipDot,
                                { backgroundColor: def.color },
                              ]}
                            />
                            <Text
                              style={[
                                styles.chipText,
                                isActive && {
                                  color: def.color,
                                  fontWeight: "bold",
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {isLoan ? "👤 " : isTransferType ? "↔ " : ""}
                              {def.label}
                              {def.archived ? "  (مؤرشف)" : ""}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                );
              })}

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

              <TextInput
                ref={amountInputRef}
                style={styles.input}
                placeholder="المبلغ"
                keyboardType="numeric"
                value={txAmount}
                onChangeText={(text) => setTxAmount(formatNumberInput(text))}
                textAlign="right"
              />

              {/* ---------- INLINE PERSON SECTION (loans only) ---------- */}
              {loanType && (
                <>
                  <Text style={styles.modalLabel}>
                    {currentTypeDef?.countsAsLoanReceived
                      ? "الشخص المُقرض منه"
                      : "الشخص المُقرض له"}
                  </Text>

                  {person ? (
                    <View style={styles.personCard}>
                      <View style={styles.personAvatar}>
                        <Text style={styles.personAvatarText}>
                          {person.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.personInfo}>
                        <Text style={styles.personName} numberOfLines={1}>
                          {person.name}
                        </Text>
                        {person.phone ? (
                          <Text style={styles.personPhone} numberOfLines={1}>
                            {person.phone}
                          </Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        style={styles.personChangeBtn}
                        onPress={() => setPersonPickerOpen(true)}
                      >
                        <Text style={styles.personChangeText}>تغيير</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.personClearBtn}
                        onPress={() => setPerson(null)}
                      >
                        <MaterialIcons name="close" size={18} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.personPickBtn}
                      onPress={() => setPersonPickerOpen(true)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons
                        name="person-add"
                        size={22}
                        color="#0F172A"
                      />
                      <Text style={styles.personPickText}>
                        اختر الشخص من جهات الاتصال
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              <TextInput
                style={styles.input}
                placeholder={
                  loanType
                    ? "ملاحظات إضافية (اختياري)"
                    : "الوصف (مواد، مورد، الخ)"
                }
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
            </ScrollView>
          )}

          {/* ---------- PICKER VIEW (inline, replaces the form) ---------- */}
          {personPickerOpen && (
            <View style={styles.pickerContainer}>
              {/* Picker header */}
              <View style={styles.pickerHeader}>
                <TouchableOpacity
                  style={styles.pickerBackBtn}
                  onPress={() => setPersonPickerOpen(false)}
                >
                  <MaterialIcons
                    name="arrow-forward"
                    size={22}
                    color="#0F172A"
                  />
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>اختر الشخص</Text>
                <View style={{ width: 36 }} />
              </View>

              {/* Search */}
              <View style={styles.searchRow}>
                <MaterialIcons name="search" size={20} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                  placeholderTextColor="#94A3B8"
                  value={contactSearch}
                  onChangeText={setContactSearch}
                  textAlign="right"
                />
              </View>

              {/* Manual entry (always visible; acts as fallback) */}
              <View style={styles.manualRow}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.manualInput}
                    placeholder="اسم شخص جديد"
                    placeholderTextColor="#94A3B8"
                    value={manualName}
                    onChangeText={setManualName}
                    textAlign="right"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.manualInput}
                    placeholder="هاتف (اختياري)"
                    placeholderTextColor="#94A3B8"
                    value={manualPhone}
                    onChangeText={setManualPhone}
                    textAlign="right"
                    keyboardType="phone-pad"
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.manualAddBtn,
                    !manualName.trim() && styles.manualAddBtnDisabled,
                  ]}
                  onPress={addManualPerson}
                  disabled={!manualName.trim()}
                >
                  <MaterialIcons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Contacts list */}
              {contactsStatus === "loading" && (
                <View style={styles.pickerCenter}>
                  <ActivityIndicator size="large" color="#111827" />
                  <Text style={styles.pickerInfoText}>
                    جارٍ تحميل جهات الاتصال...
                  </Text>
                </View>
              )}

              {(contactsStatus === "denied" || contactsStatus === "error") && (
                <View style={styles.pickerCenter}>
                  <MaterialIcons name="contacts" size={48} color="#9ca3af" />
                  <Text style={styles.pickerInfoText}>
                    لا يمكن الوصول إلى جهات الاتصال
                  </Text>
                  <TouchableOpacity
                    style={styles.pickerRetryBtn}
                    onPress={loadContacts}
                  >
                    <Text style={styles.pickerRetryText}>إعادة المحاولة</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => Linking.openSettings()}
                    style={{ marginTop: 8 }}
                  >
                    <Text style={styles.pickerLinkText}>فتح الإعدادات</Text>
                  </TouchableOpacity>
                </View>
              )}

              {contactsStatus === "granted" && (
                <FlatList
                  data={filteredContacts}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 16 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.contactRow}
                      onPress={() => pickContact(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.contactAvatar}>
                        <Text style={styles.contactAvatarText}>
                          {item.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.phone ? (
                          <Text style={styles.contactPhone} numberOfLines={1}>
                            {item.phone}
                          </Text>
                        ) : null}
                      </View>
                      <MaterialIcons
                        name="chevron-left"
                        size={22}
                        color="#CBD5E1"
                      />
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.pickerCenter}>
                      <MaterialIcons
                        name="person-search"
                        size={40}
                        color="#9ca3af"
                      />
                      <Text style={styles.pickerInfoText}>
                        لا توجد جهات اتصال مطابقة
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          )}
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
    minHeight: 420,
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
    marginBottom: 12,
  },

  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  groupContainer: { marginBottom: 14 },
  groupHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  groupAccentBar: { width: 4, height: 16, borderRadius: 2 },
  groupLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "right",
  },
  groupHint: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    textAlign: "right",
  },
  chipRowContent: {
    flexDirection: "row-reverse",
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },

  chip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6 },
  chipActive: { backgroundColor: "#dbeafe", borderColor: "#3b82f6" },
  chipText: { color: "#4b5563", fontSize: 14 },
  chipTextActive: { color: "#1d4ed8", fontWeight: "bold" },

  personCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  personAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
  },
  personAvatarText: { color: "white", fontWeight: "700", fontSize: 16 },
  personInfo: { flex: 1, alignItems: "flex-end" },
  personName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    textAlign: "right",
  },
  personPhone: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
    textAlign: "right",
    writingDirection: "ltr",
  },
  personChangeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  personChangeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  personClearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
  },

  personPickBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingVertical: 16,
    backgroundColor: "#F8FAFC",
    marginBottom: 12,
  },
  personPickText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
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
  dateText: { textAlign: "right", color: "#111827", fontSize: 14 },
  datePickerContainer: { alignItems: "center", marginBottom: 12 },
  doneButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    alignSelf: "stretch",
    alignItems: "center",
  },
  doneButtonText: { color: "#1d4ed8", fontWeight: "bold" },
  modalBtn: { flex: 1, padding: 14, borderRadius: 8, alignItems: "center" },
  cancelBtn: { backgroundColor: "#f3f4f6", marginRight: 8 },
  cancelBtnText: { color: "#374151", fontWeight: "600" },
  saveBtn: { backgroundColor: "#111827" },
  saveBtnText: { color: "white", fontWeight: "600" },

  // ---------- Picker view ----------
  pickerContainer: {
    flex: 1,
    minHeight: 420,
  },
  pickerHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  pickerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  searchRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    paddingVertical: 8,
  },
  manualRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  manualInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  manualAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
  manualAddBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
  pickerCenter: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  pickerInfoText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
  },
  pickerRetryBtn: {
    marginTop: 8,
    backgroundColor: "#111827",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pickerRetryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  pickerLinkText: {
    color: "#2563eb",
    fontWeight: "600",
    fontSize: 13,
  },
  contactRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
  },
  contactAvatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  contactInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  contactName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    textAlign: "right",
  },
  contactPhone: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
    textAlign: "right",
    writingDirection: "ltr",
  },
});
