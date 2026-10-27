// src/app/project/[id]/settings.tsx
import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useStore } from "../../../store/useStore";
import { TransactionDirection, TransactionTypeDef } from "../../../types";

const DIRECTIONS: { id: TransactionDirection; label: string }[] = [
  { id: "INFLOW", label: "داخل (يزيد الرصيد)" },
  { id: "OUTFLOW", label: "خارج (ينقص الرصيد)" },
  { id: "NEUTRAL", label: "محايد (لا يؤثر)" },
];

const PALETTE = [
  "#10b981", // green (income)
  "#8B5CF6", // violet (loan received)
  "#EF4444", // red (outflow)
  "#2563eb", // blue (transfer)
  "#f59e0b", // amber
  "#0ea5e9", // sky
  "#ec4899", // pink
  "#64748b", // slate
];

export default function ProjectSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    projects,
    transactions,
    addTransactionType,
    updateTransactionType,
    removeTransactionType,
    reorderTransactionTypes,
  } = useStore();

  const project = projects.find((p) => p.id === id);

  // -------- Add form state --------
  const [newLabel, setNewLabel] = useState("");
  const [newDirection, setNewDirection] =
    useState<TransactionDirection>("OUTFLOW");
  const [newColor, setNewColor] = useState(PALETTE[2]);

  // -------- Inline edit state --------
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState<string>("");
  const [editDirection, setEditDirection] =
    useState<TransactionDirection>("OUTFLOW");

  // Map of type id -> count of transactions, computed once per render pass.
  const usageCounts = useMemo(() => {
    if (!project) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    transactions.forEach((t) => {
      if (t.projectId !== project.id) return;
      counts[t.type] = (counts[t.type] ?? 0) + 1;
    });
    return counts;
  }, [transactions, project]);

  if (!project) {
    return (
      <View style={styles.center}>
        <Text>المشروع غير موجود</Text>
      </View>
    );
  }

  // Generate a stable id for a new custom type. Uppercased slug + timestamp
  // so the user can re-create a type with the same label later without a
  // collision.
  const makeId = (label: string) => {
    const slug = label
      .trim()
      .toUpperCase()
      .replace(/[^\p{L}\p{N}]+/gu, "_")
      .replace(/^_+|_+$/g, "");
    return `${slug || "TYPE"}_${Date.now().toString(36)}`;
  };

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;

    // Duplicate label guard (case-insensitive) — cheap and prevents user
    // confusion when two chips read the same.
    const dup = project.transactionTypes.some(
      (t) => t.label.trim() === label && !t.archived,
    );
    if (dup) {
      Alert.alert("نوع مكرر", `يوجد نوع بنفس الاسم "${label}" بالفعل.`);
      return;
    }

    const def: TransactionTypeDef = {
      id: makeId(label),
      label,
      direction: newDirection,
      affectsBalance: newDirection !== "NEUTRAL",
      color: newColor,
    };
    addTransactionType(project.id, def);
    setNewLabel("");
    setNewDirection("OUTFLOW");
    setNewColor(PALETTE[2]);
  };

  const startEdit = (def: TransactionTypeDef) => {
    setEditingId(def.id);
    setEditLabel(def.label);
    setEditColor(def.color);
    setEditDirection(def.direction);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel("");
    setEditColor("");
    setEditDirection("OUTFLOW");
  };

  const commitEdit = (def: TransactionTypeDef) => {
    const label = editLabel.trim();
    if (!label) return;

    // Duplicate label guard, excluding the row we're editing.
    const dup = project.transactionTypes.some(
      (t) => t.id !== def.id && t.label.trim() === label && !t.archived,
    );
    if (dup) {
      Alert.alert("نوع مكرر", `يوجد نوع بنفس الاسم "${label}" بالفعل.`);
      return;
    }

    updateTransactionType(project.id, def.id, {
      label,
      color: editColor,
      // System types keep their direction — that direction is baked into
      // the loan/report semantics, so let them only change cosmetic fields.
      ...(def.isSystem
        ? {}
        : {
            direction: editDirection,
            affectsBalance: editDirection !== "NEUTRAL",
          }),
    });
    cancelEdit();
  };

  const handleRemove = (def: TransactionTypeDef) => {
    const inUse = (usageCounts[def.id] ?? 0) > 0;

    // System types and types used by any existing transaction are archived,
    // not deleted, so historical rows keep a resolvable label.
    if (def.isSystem || inUse) {
      Alert.alert(
        "أرشفة النوع",
        def.isSystem
          ? `"${def.label}" نوع نظامي — سيتم إخفاؤه من القوائم مع الحفاظ على المعاملات القديمة.`
          : `"${def.label}" مستخدم في ${usageCounts[def.id]} معاملة — سيتم إخفاؤه من القوائم بدلاً من حذفه.`,
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "أرشفة",
            style: "destructive",
            onPress: () => removeTransactionType(project.id, def.id),
          },
        ],
      );
      return;
    }

    Alert.alert("حذف النوع", `هل أنت متأكد من حذف "${def.label}"؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => removeTransactionType(project.id, def.id),
      },
    ]);
  };

  const handleUnarchive = (def: TransactionTypeDef) => {
    updateTransactionType(project.id, def.id, { archived: false });
  };

  const move = (def: TransactionTypeDef, dir: -1 | 1) => {
    const ids = project.transactionTypes.map((t) => t.id);
    const idx = ids.indexOf(def.id);
    const swap = idx + dir;
    if (swap < 0 || swap >= ids.length) return;
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    reorderTransactionTypes(project.id, ids);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitleAlign: "center",
          headerTitle: "أنواع المعاملات",
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ------- Existing types ------- */}
        <Text style={styles.sectionTitle}>أنواع المعاملة الحالية</Text>
        <Text style={styles.sectionHint}>
          اسحب باستخدام الأسهم لإعادة الترتيب. الأنواع النظامية لا يمكن حذفها
          نهائياً، بل تُؤرشف فقط.
        </Text>

        {project.transactionTypes.map((def, index) => {
          const isEditing = editingId === def.id;
          const usage = usageCounts[def.id] ?? 0;
          return (
            <View
              key={def.id}
              style={[styles.card, def.archived && styles.cardArchived]}
            >
              {/* Row 1: color dot + label + badges */}
              <View style={styles.cardTopRow}>
                <View style={[styles.dot, { backgroundColor: def.color }]} />

                {isEditing ? (
                  <TextInput
                    style={styles.inlineInput}
                    value={editLabel}
                    onChangeText={setEditLabel}
                    autoFocus
                    textAlign="right"
                  />
                ) : (
                  <Text style={styles.label} numberOfLines={1}>
                    {def.label}
                  </Text>
                )}

                <View style={styles.badges}>
                  {def.isSystem && (
                    <View style={[styles.badge, styles.badgeSystem]}>
                      <Text style={styles.badgeText}>نظامي</Text>
                    </View>
                  )}
                  {def.archived && (
                    <View style={[styles.badge, styles.badgeArchived]}>
                      <Text style={styles.badgeText}>مؤرشف</Text>
                    </View>
                  )}
                  {usage > 0 && (
                    <View style={[styles.badge, styles.badgeUsage]}>
                      <Text style={styles.badgeText}>{usage}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Row 2: direction badge */}
              {isEditing ? (
                <View style={styles.editDirectionRow}>
                  {DIRECTIONS.map((d) => {
                    const disabled = def.isSystem && d.id !== def.direction;
                    return (
                      <TouchableOpacity
                        key={d.id}
                        disabled={disabled}
                        style={[
                          styles.dirChip,
                          editDirection === d.id && styles.dirChipActive,
                          disabled && styles.dirChipDisabled,
                        ]}
                        onPress={() => setEditDirection(d.id)}
                      >
                        <Text
                          style={[
                            styles.dirChipText,
                            editDirection === d.id && styles.dirChipTextActive,
                            disabled && styles.dirChipTextDisabled,
                          ]}
                        >
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.dirBadgeRow}>
                  <View style={styles.dirBadge}>
                    <Text style={styles.dirBadgeText}>
                      {def.direction === "INFLOW"
                        ? "داخل"
                        : def.direction === "OUTFLOW"
                          ? "خارج"
                          : "محايد"}
                    </Text>
                  </View>
                  {!def.affectsBalance && (
                    <Text style={styles.noEffectText}>لا يؤثر على الرصيد</Text>
                  )}
                </View>
              )}

              {/* Row 3: color swatches (only while editing) */}
              {isEditing && (
                <View style={styles.swatchRow}>
                  {PALETTE.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setEditColor(c)}
                      style={[
                        styles.swatch,
                        { backgroundColor: c },
                        editColor === c && styles.swatchSelected,
                      ]}
                    />
                  ))}
                </View>
              )}

              {/* Row 4: actions */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() => move(def, -1)}
                  disabled={index === 0}
                >
                  <Text
                    style={[
                      styles.smallBtnText,
                      index === 0 && styles.smallBtnTextDisabled,
                    ]}
                  >
                    ↑
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() => move(def, 1)}
                  disabled={index === project.transactionTypes.length - 1}
                >
                  <Text
                    style={[
                      styles.smallBtnText,
                      index === project.transactionTypes.length - 1 &&
                        styles.smallBtnTextDisabled,
                    ]}
                  >
                    ↓
                  </Text>
                </TouchableOpacity>

                {isEditing ? (
                  <>
                    <TouchableOpacity
                      style={[styles.smallBtn, styles.saveSmall]}
                      onPress={() => commitEdit(def)}
                    >
                      <Text style={styles.saveSmallText}>حفظ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.smallBtn}
                      onPress={cancelEdit}
                    >
                      <Text style={styles.smallBtnText}>إلغاء</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.smallBtn}
                      onPress={() => startEdit(def)}
                    >
                      <Text style={styles.smallBtnText}>تعديل</Text>
                    </TouchableOpacity>

                    {def.archived ? (
                      <TouchableOpacity
                        style={[styles.smallBtn, styles.restoreSmall]}
                        onPress={() => handleUnarchive(def)}
                      >
                        <Text style={styles.restoreSmallText}>استعادة</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.smallBtn, styles.deleteSmall]}
                        onPress={() => handleRemove(def)}
                      >
                        <Text style={styles.deleteSmallText}>
                          {def.isSystem || usage > 0 ? "أرشفة" : "حذف"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>
          );
        })}

        {/* ------- Add new type ------- */}
        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
          إضافة نوع جديد
        </Text>
        <Text style={styles.sectionHint}>
          الأنواع المخصصة تظهر فوراً في نموذج إضافة المعاملة وتُدرج في التقارير
          المالية.
        </Text>

        <View style={styles.formCard}>
          <TextInput
            style={styles.input}
            placeholder="اسم النوع (مثال: صيانة معدات)"
            value={newLabel}
            onChangeText={setNewLabel}
            textAlign="right"
          />

          <Text style={styles.fieldLabel}>اتجاه الرصيد</Text>
          <View style={styles.chipWrap}>
            {DIRECTIONS.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[
                  styles.dirChip,
                  newDirection === d.id && styles.dirChipActive,
                ]}
                onPress={() => setNewDirection(d.id)}
              >
                <Text
                  style={[
                    styles.dirChipText,
                    newDirection === d.id && styles.dirChipTextActive,
                  ]}
                >
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>اللون</Text>
          <View style={styles.swatchRow}>
            {PALETTE.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setNewColor(c)}
                style={[
                  styles.swatch,
                  { backgroundColor: c },
                  newColor === c && styles.swatchSelected,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.addBtn, !newLabel.trim() && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!newLabel.trim()}
          >
            <Text style={styles.addBtnText}>+ إضافة النوع</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "right",
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "right",
    marginBottom: 14,
    lineHeight: 18,
  },

  // ----- Card -----
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardArchived: {
    backgroundColor: "#F8FAFC",
    opacity: 0.85,
  },
  cardTopRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "right",
  },
  inlineInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
    paddingVertical: 4,
  },
  badges: {
    flexDirection: "row-reverse",
    gap: 6,
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeSystem: { backgroundColor: "#DBEAFE" },
  badgeArchived: { backgroundColor: "#FEF3C7" },
  badgeUsage: { backgroundColor: "#E2E8F0" },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
  },

  // ----- Direction rows -----
  dirBadgeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  dirBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  dirBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  noEffectText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },

  editDirectionRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },

  // ----- Chips -----
  chipWrap: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  dirChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dirChipActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  dirChipDisabled: {
    opacity: 0.4,
  },
  dirChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  dirChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dirChipTextDisabled: {
    color: "#94A3B8",
  },

  // ----- Color swatches -----
  swatchRow: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 10,
    marginBottom: 6,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchSelected: {
    borderColor: "#0F172A",
  },

  // ----- Action row -----
  actionRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    minWidth: 40,
    alignItems: "center",
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  smallBtnTextDisabled: {
    color: "#CBD5E1",
  },
  saveSmall: { backgroundColor: "#0F172A" },
  saveSmallText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  deleteSmall: { backgroundColor: "#FEF2F2" },
  deleteSmallText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  restoreSmall: { backgroundColor: "#ECFDF5" },
  restoreSmallText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },

  // ----- Add form -----
  formCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    textAlign: "right",
    marginBottom: 8,
  },
  addBtn: {
    backgroundColor: "#0F172A",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 14,
  },
  addBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
