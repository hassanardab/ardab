import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: "#000000",
        tabBarActiveTintColor: "#000000",
        tabBarInactiveTintColor: "#a7a9ac",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#a7a9ac",
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          headerTitleAlign: "center",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="dashboard" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "التقارير",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="analytics" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "الملف الشخصي",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="person" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "الرسائل",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="message" size={24} color={color} />
          ),
        }}
      />

      {/* Hide the specific nested project routes from the tab bar */}
      <Tabs.Screen
        name="project/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="project/[id]/report"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
