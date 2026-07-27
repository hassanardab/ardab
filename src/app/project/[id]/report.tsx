import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import {
  exportPdf,
  getFinancialReportHtml,
} from "../../../services/PdfService";
import { useStore } from "../../../store/useStore";

export default function ReportPreviewScreen() {
  // Capture timeFilter from params
  const { id, timeFilter } = useLocalSearchParams<{
    id: string;
    timeFilter?: string;
  }>();
  const { projects, transactions } = useStore();

  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
      <View style={styles.center}>
        <Text>المشروع غير موجود</Text>
      </View>
    );
  }

  // 1. Filter logic based on the user's selected time period
  const filteredTransactions = transactions
    .filter((t) => t.projectId === id)
    .filter((t) => {
      if (!timeFilter || timeFilter === "ALL") return true;

      const txTime = new Date(t.date).getTime();
      const now = new Date();

      if (timeFilter === "THIS_MONTH") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        return txTime >= start;
      }
      if (timeFilter === "LAST_MONTH") {
        const start = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1,
        ).getTime();
        const end = new Date(
          now.getFullYear(),
          now.getMonth(),
          0,
          23,
          59,
          59,
          999,
        ).getTime();
        return txTime >= start && txTime <= end;
      }
      if (timeFilter === "THIS_YEAR") {
        const start = new Date(now.getFullYear(), 0, 1).getTime();
        return txTime >= start;
      }
      return true;
    });

  // 2. Generate the dynamic Arabic label for the selected period
  let periodLabel = "تاريخ المشروع بالكامل";
  if (timeFilter === "THIS_MONTH") periodLabel = "هذا الشهر";
  if (timeFilter === "LAST_MONTH") periodLabel = "الشهر الماضي";
  if (timeFilter === "THIS_YEAR") periodLabel = "هذا العام";

  // 3. Pass the filtered transactions and the period label
  const htmlContent = getFinancialReportHtml(
    project,
    filteredTransactions,
    periodLabel,
  );

  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });

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
          onPress={() => exportPdf(htmlContent, fileName)}
        >
          <Text style={styles.exportBtnText}>تصدير PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// (Keep styles the exact same)
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
