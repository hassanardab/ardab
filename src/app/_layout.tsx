// src/app/_layout.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// NOTE: SafeAreaProvider MUST be above the Tabs so that
// useSafeAreaInsets() works inside every screen.
export default function TabLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <TabsShell />
    </SafeAreaProvider>
  );
}

function TabsShell() {
  const insets = useSafeAreaInsets();

  // Base height the tab bar needs for its icons + labels.
  // (React Navigation's default is ~49 on iOS, ~56 on Android.)
  // We ADD the bottom safe-area inset so the bar's background
  // extends behind the home indicator on modern phones, and add
  // matching bottom padding so the icons stay above it.
  const BASE_TAB_BAR_HEIGHT = 56;
  const TAB_BAR_HEIGHT = BASE_TAB_BAR_HEIGHT + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: "#000000",
        tabBarActiveTintColor: "#000000",
        tabBarInactiveTintColor: "#a7a9ac",
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#a7a9ac",
          borderTopWidth: 0.5,
          // This is what removes the gray strip:
          height: TAB_BAR_HEIGHT,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 6,
          paddingTop: 4,
          // Make sure the background paints even in the inset zone:
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="dashboard" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: "الفواتير",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="receipt" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "الأسماء",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="people" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="project/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="project/[id]/report"
        options={{ href: null, headerShown: false }}
      />
      <Tabs.Screen name="invoice/[id]" options={{ href: null }} />
      <Tabs.Screen name="project/[id]/settings" options={{ href: null }} />
    </Tabs>
  );
}
