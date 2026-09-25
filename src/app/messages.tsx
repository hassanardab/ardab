// src/app/messages.tsx
import { MaterialIcons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type ContactCard = {
  id: string;
  name: string;
  phone?: string;
};

type ScreenStatus = "loading" | "granted" | "denied" | "error";

export default function MessagesScreen() {
  const [contacts, setContacts] = useState<ContactCard[]>([]);
  const [status, setStatus] = useState<ScreenStatus>("loading");

  const loadContacts = useCallback(async () => {
    try {
      setStatus("loading");

      // 1) Ask for permission
      const { status: permStatus } = await Contacts.requestPermissionsAsync();

      if (permStatus !== "granted") {
        setStatus("denied");
        return;
      }

      // 2) Fetch contacts
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });

      // 3) Keep only entries that actually have a name, sort them
      const formatted: ContactCard[] = data
        .filter((c) => c.name && c.name.trim().length > 0)
        .map((c) => ({
          id:
            c.id ?? `${c.name}-${c.phoneNumbers?.[0]?.number ?? Math.random()}`,
          name: c.name!.trim(),
          phone: c.phoneNumbers?.[0]?.number,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setContacts(formatted);
      setStatus("granted");
    } catch (err) {
      console.warn("Contacts error:", err);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // ---------- Loading ----------
  if (status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.infoText}>جارٍ تحميل جهات الاتصال...</Text>
      </View>
    );
  }

  // ---------- Permission denied / error ----------
  if (status === "denied" || status === "error") {
    return (
      <View style={styles.center}>
        <MaterialIcons name="contacts" size={56} color="#9ca3af" />
        <Text style={styles.errorTitle}>لا يمكن الوصول إلى جهات الاتصال</Text>
        <Text style={styles.errorSubtitle}>
          يرجى السماح بالوصول إلى جهات الاتصال لعرض قائمة الأسماء
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={loadContacts}>
          <Text style={styles.primaryBtnText}>إعادة المحاولة</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.linkBtnText}>فتح الإعدادات</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------- Contacts list ----------
  return (
    <View style={styles.container}>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              {item.phone ? (
                <Text style={styles.phone} numberOfLines={1}>
                  {item.phone}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.infoText}>لا توجد جهات اتصال</Text>
          </View>
        }
      />

      <View style={styles.footerInfo}>
        <Text style={styles.footerText}>{contacts.length} جهة اتصال</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f3f4f6",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "white",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  avatarText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  infoBlock: {
    flex: 1,
    alignItems: "flex-end",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    textAlign: "right",
  },
  phone: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 3,
    textAlign: "right",
    writingDirection: "ltr",
  },
  infoText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  errorSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: "#111827",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  linkBtn: {
    marginTop: 12,
    padding: 8,
  },
  linkBtnText: {
    color: "#2563eb",
    fontWeight: "600",
    fontSize: 13,
  },
  footerInfo: {
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    backgroundColor: "white",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
});
