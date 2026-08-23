import { StyleSheet, Text, View } from "react-native";

export default function MessagesScreen() {
  return (
    <View style={styles.center}>
      <Text>Invoices UI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
