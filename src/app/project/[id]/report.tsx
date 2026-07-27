import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import {
  exportPdf,
  getFinancialReportHtml,
} from "../../../services/PdfService";
import { useStore } from "../../../store/useStore";

export default function ReportPreviewScreen() {
  const { id } = useLocalSearchParams();
  const { projects, transactions } = useStore();

  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
      <View style={styles.center}>
        <Text>المشروع غير موجود</Text>
      </View>
    );
  }

  const htmlContent = getFinancialReportHtml(project, transactions);

  // 1. Generate the date string matching your reports page format
  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });

  // 2. Construct the dynamic file name
  const fileName = `التقرير المالي مشروع ${project.name}-${dateStr}.pdf`;

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
          // 3. Pass the custom file name to the export service
          onPress={() => exportPdf(htmlContent, fileName)}
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
