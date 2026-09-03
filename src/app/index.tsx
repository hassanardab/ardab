import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AddTransactionBottomSheet from "../components/AddTransactionBottomSheet";
import { useStore } from "../store/useStore";
import { Project } from "../types";
import { formatCurrency } from "../utils/format";

export default function DashboardScreen() {
  const router = useRouter();
  const { projects, addProject, updateProject } = useStore();
  const [newProjectName, setNewProjectName] = useState("");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );

  const handleCreateProject = () => {
    if (!newProjectName) return;
    addProject({
      id: Date.now().toString(),
      name: newProjectName,
      initialCash: 0,
      initialBank: 0,
      createdAt: new Date().toISOString(),
    });
    setNewProjectName("");
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setEditName(project.name);
  };

  const saveEdit = () => {
    if (editingProject && editName.trim()) {
      updateProject(editingProject.id, { name: editName.trim() });
      setEditingProject(null);
      setEditName("");
    }
  };

  const openTransactionModal = (projectId: string) => {
    setSelectedProjectId(projectId);
    setIsModalVisible(true);
  };
  // Format today's date in Arabic (e.g., "الخميس، ٣ سبتمبر")
  const formattedDate = new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top Header Bar with Date */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.dateText}>{formattedDate}</Text>
          <Text style={styles.header}>المشاريع النشطة</Text>
        </View>
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logo}
        />
      </View>

      {projects.map((project) => (
        <TouchableOpacity
          key={project.id}
          style={styles.card}
          onPress={() => router.push(`/project/${project.id}`)}
          onLongPress={() => handleEditProject(project)}
          activeOpacity={0.7}
        >
          <Text style={styles.cardTitle}>{project.name}</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceBlock}>
              <Text style={styles.label}>الرصيد النقدي</Text>
              <Text style={styles.cashAmount}>
                {formatCurrency(project.currentCash)}
              </Text>
            </View>
            <View style={styles.balanceBlock}>
              <Text style={styles.label}>الرصيد البنكي</Text>
              <Text style={styles.bankAmount}>
                {formatCurrency(project.currentBank)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={(e) => {
              e.stopPropagation();
              openTransactionModal(project.id);
            }}
          >
            <Text style={styles.actionBtnText}>+ إضافة معاملة</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="اسم المشروع الجديد"
          value={newProjectName}
          onChangeText={setNewProjectName}
          textAlign="right"
        />
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleCreateProject}
        >
          <Text style={styles.primaryBtnText}>إنشاء مشروع</Text>
        </TouchableOpacity>
      </View>

      {/* المودال المستقل */}
      {selectedProjectId && (
        <AddTransactionBottomSheet
          projectId={selectedProjectId}
          visible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
        />
      )}
      {/* Edit Project Modal */}
      <Modal
        visible={!!editingProject}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingProject(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <Text style={styles.modalHeader}>العديل على المشروع </Text>
            <TextInput
              style={styles.input}
              placeholder="اسم المشروع"
              value={editName}
              onChangeText={setEditName}
              textAlign="right"
              autoFocus
            />
            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={saveEdit}
              >
                <Text style={styles.saveBtnText}>حفظ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setEditingProject(null);
                  setEditName("");
                }}
              >
                <Text style={styles.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6", padding: 16 },
  headerContainer: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  editModalContent: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 20,
    margin: 24,
    // center vertically
    marginTop: "auto",
    marginBottom: "auto",
  },
  editModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  // we reuse modalOverlay from existing styles (it's defined below)
  // but we need to ensure it's available; it's already there for the transaction modal
  // So we can reuse it.

  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "right",
  },
  logo: {
    width: 45,
    height: 45,
    borderRadius: 10,
  },
  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "right",
  },
  balanceRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  balanceBlock: { flex: 1, alignItems: "flex-start" },
  label: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  cashAmount: { fontSize: 20, fontWeight: "bold", color: "#059669" },
  bankAmount: { fontSize: 20, fontWeight: "bold", color: "#2563eb" },
  actionBtn: {
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnText: { color: "#374151", fontWeight: "500" },
  form: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
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
  primaryBtn: {
    backgroundColor: "#111827",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryBtnText: { color: "white", fontWeight: "600" },
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
  modalBtn: { flex: 1, padding: 14, borderRadius: 8, alignItems: "center" },
  cancelBtn: { backgroundColor: "#f3f4f6", marginRight: 8 },
  cancelBtnText: { color: "#374151", fontWeight: "600" },
  saveBtn: { backgroundColor: "#111827" },
  saveBtnText: { color: "white", fontWeight: "600" },
  headerTextGroup: {
    alignItems: "flex-end",
  },
  dateText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 2,
  },
});
