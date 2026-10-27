import type { ReportSize } from "@/services/repoetTemplates/A4";
import { getArFinancialReportHtml } from "@/services/repoetTemplates/A4";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { exportPdf, PDF_PAGE_SIZES } from "../../../services/PdfService";
import { useStore } from "../../../store/useStore";

export default function ReportPreviewScreen() {
  const { id, timeFilter } = useLocalSearchParams<{
    id: string;
    timeFilter?: string;
  }>();

  const { projects, transactions } = useStore();
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [reportSize, setReportSize] = useState<ReportSize>("A4");
  const [isRegenerating, setIsRegenerating] = useState(false);

  const project = projects.find((p) => p.id === id);

  // Keep a stable, filtered transaction list so the HTML effect re-runs
  // when either the filter or the size changes.
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.projectId === id)
      .filter((t) => {
        if (!timeFilter || timeFilter === "ALL") return true;

        const txTime = new Date(t.date).getTime();
        const now = new Date();

        if (timeFilter === "THIS_MONTH") {
          const start = new Date(
            now.getFullYear(),
            now.getMonth(),
            1,
          ).getTime();
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
  }, [id, timeFilter, transactions]);

  const periodLabel = useMemo(() => {
    let label = "تاريخ المشروع بالكامل";
    if (timeFilter === "THIS_MONTH") label = "هذا الشهر";
    if (timeFilter === "LAST_MONTH") label = "الشهر الماضي";
    if (timeFilter === "THIS_YEAR") label = "هذا العام";
    return label;
  }, [timeFilter]);

  useEffect(() => {
    if (!project) return;

    let cancelled = false;

    const generateHtml = async () => {
      setIsRegenerating(true);
      try {
        const html = await getArFinancialReportHtml(
          project,
          filteredTransactions,
          periodLabel,
          reportSize, // <-- new
        );
        if (!cancelled) setHtmlContent(html);
      } finally {
        if (!cancelled) setIsRegenerating(false);
      }
    };

    generateHtml();
    return () => {
      cancelled = true;
    };
  }, [project, filteredTransactions, periodLabel, reportSize]);

  if (!project) {
    return (
      <View style={styles.center}>
        <Text>المشروع غير موجود</Text>
      </View>
    );
  }

  if (!htmlContent) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={{ marginTop: 12 }}>جاري تجهيز التقرير...</Text>
      </View>
    );
  }

  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });

  // Filename now includes the size so A4 and Mobile exports don't collide.
  const sizeTag = reportSize === "A4" ? "A4" : "Mobile";
  const fileName = `التقرير المالي_${project.name}_${dateStr}_${sizeTag}.pdf`;

  // WebView needs help rendering the smaller page nicely. On Android,
  // scalesPageToFit makes the small 340pt page fit the phone width. On iOS,
  // the viewport meta inside the HTML (user-scalable=no) does that already.
  // We ALSO inject a <style> to force the whole page to fit the view width
  // while preserving proportions, since the template's @page rules only
  // affect print output, not the WebView itself.
  const injectedJS = `
    (function() {
      var meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        document.head.appendChild(meta);
      }
      meta.content = 'width=device-width, initial-scale=1.0';
      document.body.style.zoom = '${reportSize === "MOBILE" ? "1.35" : "1"}';
      true;
    })();
  `;

  return (
    <>
      <Stack.Screen
        options={{
          headerTitleAlign: "center",
          headerTitle: "التقرير",
        }}
      />
      <View style={styles.container}>
        <WebView
          source={{ html: htmlContent }}
          style={styles.webview}
          originWhitelist={["*"]}
          scalesPageToFit={Platform.OS === "android" ? true : undefined}
          injectedJavaScript={injectedJS}
        />

        {isRegenerating && (
          <View style={styles.regenOverlay}>
            <ActivityIndicator size="small" color="#111827" />
            <Text style={styles.regenText}>جاري التحديث…</Text>
          </View>
        )}

        <View style={styles.footer}>
          {/* Size toggle */}
          <View style={styles.sizeRow}>
            <Text style={styles.sizeLabel}>حجم الصفحة:</Text>
            <View style={styles.sizeToggle}>
              <TouchableOpacity
                style={[
                  styles.sizeBtn,
                  reportSize === "A4" && styles.sizeBtnActive,
                ]}
                onPress={() => setReportSize("A4")}
              >
                <Text
                  style={[
                    styles.sizeBtnText,
                    reportSize === "A4" && styles.sizeBtnTextActive,
                  ]}
                >
                  A4
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sizeBtn,
                  reportSize === "MOBILE" && styles.sizeBtnActive,
                ]}
                onPress={() => setReportSize("MOBILE")}
              >
                <Text
                  style={[
                    styles.sizeBtnText,
                    reportSize === "MOBILE" && styles.sizeBtnTextActive,
                  ]}
                >
                  جوال
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Export button — passes the correct page dimensions to expo-print */}
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() =>
              exportPdf(htmlContent, fileName, PDF_PAGE_SIZES[reportSize])
            }
            disabled={isRegenerating}
          >
            <Text style={styles.exportBtnText}>
              تصدير PDF ({reportSize === "A4" ? "A4" : "جوال"})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  webview: { flex: 1, backgroundColor: "transparent" },

  regenOverlay: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "white",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  regenText: { fontSize: 12, color: "#374151", fontWeight: "600" },

  footer: {
    padding: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
  },
  sizeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sizeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  sizeToggle: {
    flexDirection: "row-reverse",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  sizeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 64,
    alignItems: "center",
  },
  sizeBtnActive: {
    backgroundColor: "#111827",
  },
  sizeBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  sizeBtnTextActive: {
    color: "#FFFFFF",
  },

  exportBtn: {
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  exportBtnText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
