import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <>
      {/* Makes the phone's top bar (battery / signal / time) visible with
          dark icons so they are readable on the white header. */}
      <StatusBar style="dark" />

      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: "#ffffff" },
          headerTintColor: "#000000",
          tabBarActiveTintColor: "#000000",
          tabBarInactiveTintColor: "#a7a9ac",
          // Hides the tab bar while the keyboard is open so inputs aren't
          // covered by the tab bar + keyboard stack.
          tabBarHideOnKeyboard: true,
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
          name="invoices"
          options={{
            title: "الفواتير",
            headerTitleAlign: "center",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="receipt" size={24} color={color} />
            ),
          }}
        />{" "}
        <Tabs.Screen
          name="messages"
          options={{
            title: "الأسماء",
            headerTitleAlign: "center",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="people" size={24} color={color} />
            ),
          }}
        />
        {/* Hide nested routes */}
        <Tabs.Screen name="project/[id]" options={{ href: null }} />
        <Tabs.Screen name="project/[id]/report" options={{ href: null }} />
        <Tabs.Screen name="invoice/[id]" options={{ href: null }} />
      </Tabs>
    </>
  );
}
