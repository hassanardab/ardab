// src/app/messages/[id].tsx
import { useStore } from "@/store/useStore";
import { Message } from "@/types";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const EMPTY_MESSAGES: Message[] = [];
const CURRENT_USER_ID = "user1";

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const messages = useStore((state) => state.messages[id] ?? EMPTY_MESSAGES);
  const addMessage = useStore((state) => state.addMessage);

  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      conversationId: id,
      senderId: CURRENT_USER_ID,
      text: inputText.trim(),
      timestamp: new Date(),
      status: "sent",
    };
    addMessage(id, newMsg);
    setInputText("");
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isOwn = item.senderId === CURRENT_USER_ID;
    const timeString = new Date(item.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <View
        style={[styles.messageRow, isOwn ? styles.ownRow : styles.otherRow]}
      >
        <View
          style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}
        >
          <Text
            style={[
              styles.messageText,
              isOwn ? styles.ownText : styles.otherText,
            ]}
          >
            {item.text}
          </Text>
          <View style={styles.footerRow}>
            <Text style={[styles.timestampSmall, isOwn && styles.ownTimestamp]}>
              {timeString}
            </Text>
            {isOwn && (
              <Text style={styles.statusText}>
                {item.status === "read" ? " ✓✓" : " ✓"}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          inverted
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message..."
            placeholderTextColor="#8e8e93"
            multiline
          />
          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendButtonText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  flex: { flex: 1 },
  messageRow: { marginVertical: 3, flexDirection: "row", width: "100%" },
  ownRow: { justifyContent: "flex-end" },
  otherRow: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  ownBubble: { backgroundColor: "#007AFF", borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: "#e9ecef", borderBottomLeftRadius: 4 },
  messageText: { fontSize: 16, lineHeight: 21 },
  ownText: { color: "#fff" },
  otherText: { color: "#1c1c1e" },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  timestampSmall: {
    fontSize: 10,
    color: "#6c757d",
  },
  ownTimestamp: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  statusText: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.8)",
    marginLeft: 2,
    fontWeight: "bold",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ced4da",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    marginRight: 8,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: "#f8f9fa",
  },
  sendButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#007AFF",
    borderRadius: 18,
    marginBottom: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#adb5bd",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    lineHeight: 22,
  },
});
