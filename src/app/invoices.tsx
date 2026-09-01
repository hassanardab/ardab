// src/app/invoices.tsx
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import InvoiceBottomSheet from "../components/InvoiceBottomSheet";
import { useStore } from "../store/useStore";
import { Invoice } from "../types";

export default function InvoicesScreen() {
  const router = useRouter(); // ✅ added
  const { invoices } = useStore();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openNewInvoice = () => {
    setSelectedInvoice(null);
    setModalVisible(true);
  };

  const openEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setModalVisible(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ar-EG");
  };

  const computeTotal = (invoice: Invoice) => {
    const subtotal = invoice.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );
    const taxAmount = (subtotal * invoice.tax) / 100;
    const discountAmount = (subtotal * invoice.discount) / 100;
    return subtotal + taxAmount - discountAmount;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/invoice/${item.id}`)}
            onLongPress={() => openEditInvoice(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.companyName}>{item.companyName}</Text>
            <View style={styles.row}>
              <Text style={styles.typeBadge}>
                {item.type === "BODY_SHOP" ? "سمكرة" : "قطع غيار"}
              </Text>
              <Text style={styles.date}>{formatDate(item.date)}</Text>
              <Text style={styles.total}>
                الإجمالي: {computeTotal(item).toFixed(2)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>لا توجد فواتير بعد</Text>
        }
      />
      <TouchableOpacity style={styles.fab} onPress={openNewInvoice}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      <InvoiceBottomSheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        invoiceToEdit={selectedInvoice}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  listContent: { padding: 16 },
  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "right",
  },
  companyName: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "right",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  date: {
    color: "#4b5563",
    fontSize: 12,
  },
  total: {
    fontWeight: "600",
    fontSize: 14,
  },
  empty: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 40,
  },
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
  typeBadge: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1e40af",
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
});
