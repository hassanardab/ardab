import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { exportInvoicePdf, getInvoiceHtml } from "../../services/PdfService";
import { useStore } from "../../store/useStore";

export default function InvoicePreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { invoices } = useStore();
  const [htmlContent, setHtmlContent] = useState<string>("");

  const invoice = invoices.find((inv) => inv.id === id);

  useEffect(() => {
    if (!invoice) return;
    const loadHtml = async () => {
      const html = await getInvoiceHtml(invoice);
      setHtmlContent(html);
    };
    loadHtml();
  }, [invoice]);

  if (!invoice) {
    return (
      <View style={styles.center}>
        <Text>الفاتورة غير موجودة</Text>
      </View>
    );
  }

  if (!htmlContent) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={{ marginTop: 12 }}>جاري تجهيز الفاتورة...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        originWhitelist={["*"]}
      />
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={() => exportInvoicePdf(invoice)}
        >
          <Text style={styles.exportBtnText}>تصدير PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  webview: { flex: 1, backgroundColor: "transparent" },
  footer: {
    padding: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  exportBtn: {
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  exportBtnText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
