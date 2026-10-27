// src/app/profile.tsx
import { StyleSheet, Text, View } from "react-native";

export default function ProfileScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>الملف الشخصي</Text>
      {/* Add avatar, name, settings rows, etc. */}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
});
