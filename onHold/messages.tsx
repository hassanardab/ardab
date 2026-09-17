// src/app/messages.tsx
import { useStore } from "@/store/useStore";
import { formatRelativeTime } from "@/utils/format";
import { useRouter } from "expo-router";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function MessagesScreen() {
  const router = useRouter();
  const conversations = useStore((state) => state.conversations);
  const currentUserId = "user1";

  const getOtherParticipant = (participants: string[]) => {
    return participants.find((id) => id !== currentUserId) || "Unknown";
  };

  const formatTimestamp = (date: Date | string) => {
    if (!date) return "";
    return formatRelativeTime(new Date(date));
  };

  const getDisplayName = (uid: string) => {
    const names: Record<string, string> = {
      user1: "You",
      user2: "Alice",
      user3: "Bob",
      user4: "Charlie",
    };
    return names[uid] || uid.slice(0, 8);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          conversations.length === 0
            ? styles.emptyContainer
            : { paddingVertical: 4 }
        }
        renderItem={({ item }) => {
          const otherId = getOtherParticipant(item.participants);
          const name = getDisplayName(otherId);
          return (
            <TouchableOpacity
              style={styles.conversationItem}
              onPress={() => router.push(`/messages/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.conversationInfo}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={styles.timestamp}>
                    {formatTimestamp(item.updatedAt)}
                  </Text>
                </View>
                {item.lastMessage && (
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.lastMessage.senderId === currentUserId ? "You: " : ""}
                    {item.lastMessage.text}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={() => router.push("/messages/new" as any)}
            >
              <Text style={styles.newChatBtnText}>Start a new chat</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: { fontSize: 16, color: "#6c757d" },
  newChatBtn: {
    marginTop: 16,
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  newChatBtnText: { color: "#fff", fontWeight: "600" },
  conversationItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e9ecef",
    alignItems: "center",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#adb5bd",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  conversationInfo: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  name: { fontSize: 17, fontWeight: "600", color: "#1c1c1e" },
  lastMessage: { fontSize: 14, color: "#6c757d" },
  timestamp: { fontSize: 12, color: "#8e8e93", marginLeft: 8 },
});
