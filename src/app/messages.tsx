import { MaterialIcons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts/legacy";
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type ContactCard = {
  id: string;
  name: string;
  phone?: string;
};

type ScreenStatus = "loading" | "granted" | "denied" | "error";

export default function MessagesScreen() {
  const [contacts, setContacts] = useState<ContactCard[]>([]);
  const [status, setStatus] = useState<ScreenStatus>("loading");

  // Reserve space for the bottom tab bar and device safe area.
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 56;
  const BOTTOM_RESERVED = TAB_BAR_HEIGHT + insets.bottom;

  const loadContacts = useCallback(async () => {
    try {
      setStatus("loading");

      // Check existing permission before requesting it.
      let permission = await Contacts.getPermissionsAsync();

      if (permission.status !== "granted") {
        permission = await Contacts.requestPermissionsAsync();
      }

      if (permission.status !== "granted") {
        setContacts([]);
        setStatus("denied");
        return;
      }

      // Fetch contact names and phone numbers.
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

      console.log(
        "[Contacts] Retrieved records:",
        result.data.length,
        "Has next page:",
        result.hasNextPage,
      );

      // Explicitly build ContactCard[] to avoid null type errors.
      const formatted = result.data
        .reduce<ContactCard[]>((acc, contact) => {
          const firstName = contact.firstName?.trim() ?? "";
          const lastName = contact.lastName?.trim() ?? "";

          const name =
            contact.name?.trim() || `${firstName} ${lastName}`.trim();

          const phone = contact.phoneNumbers
            ?.find((item) => item.number?.trim())
            ?.number?.trim();

          // Keep contacts with a name or a phone number.
          if (!name && !phone) {
            return acc;
          }

          const displayName = name || phone || "Unknown contact";

          acc.push({
            id:
              contact.id ??
              `${displayName}-${phone ?? `${firstName}-${lastName}`}`,
            name: displayName,
            phone,
          });

          return acc;
        }, [])
        .sort((a, b) => a.name.localeCompare(b.name));

      console.log("[Contacts] Displayable records:", formatted.length);

      setContacts(formatted);
      setStatus("granted");
    } catch (error) {
      console.error("[Contacts] Loading failed:", error);
      setContacts([]);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // ---------- Loading ----------
  if (status === "loading") {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={styles.infoText}>جارٍ تحميل جهات الاتصال...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------- Permission denied / error ----------
  if (status === "denied" || status === "error") {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <MaterialIcons name="contacts" size={56} color="#9ca3af" />

          <Text style={styles.errorTitle}>لا يمكن الوصول إلى جهات الاتصال</Text>

          <Text style={styles.errorSubtitle}>
            يرجى السماح بالوصول إلى جهات الاتصال لعرض قائمة الأسماء
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={loadContacts}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>إعادة المحاولة</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => Linking.openSettings()}
            activeOpacity={0.8}
          >
            <Text style={styles.linkBtnText}>فتح الإعدادات</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------- Contacts list ----------
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: 32 + BOTTOM_RESERVED,
              flexGrow: contacts.length === 0 ? 1 : undefined,
            },
          ]}
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
            <View style={styles.emptyContainer}>
              <MaterialIcons name="person-search" size={44} color="#9ca3af" />
              <Text style={styles.infoText}>لا توجد جهات اتصال</Text>
            </View>
          }
        />

        {/* Footer remains above the bottom tab bar. */}
        <View
          style={[styles.footerInfo, { paddingBottom: 10 + insets.bottom }]}
        >
          <Text style={styles.footerText}>{contacts.length} جهة اتصال</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f3f4f6",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000000",
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
    color: "#ffffff",
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
    color: "#ffffff",
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
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
});
