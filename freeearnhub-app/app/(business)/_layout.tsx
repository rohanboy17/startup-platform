import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { BarChart3, BriefcaseBusiness, ClipboardList, LayoutDashboard, Wallet } from "lucide-react-native";

import { colors } from "@/lib/theme";
import { useAuth } from "@/store/auth-store";

const iconProps = { size: 20, strokeWidth: 2 };

export default function BusinessLayout() {
  const { isHydrating, isAuthenticated, user } = useAuth();

  if (isHydrating) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!isAuthenticated || !user) return <Redirect href="/(auth)/login" />;
  if (user.role !== "BUSINESS") return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: "#20283A",
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: "#7B859D",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Dashboard", tabBarIcon: ({ color }) => <LayoutDashboard color={color} {...iconProps} /> }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{ title: "Campaigns", tabBarIcon: ({ color }) => <ClipboardList color={color} {...iconProps} /> }}
      />
      <Tabs.Screen
        name="wallet"
        options={{ title: "Wallet", tabBarIcon: ({ color }) => <Wallet color={color} {...iconProps} /> }}
      />
      <Tabs.Screen
        name="jobs"
        options={{ title: "Jobs", tabBarIcon: ({ color }) => <BriefcaseBusiness color={color} {...iconProps} /> }}
      />
      <Tabs.Screen
        name="analytics"
        options={{ title: "Analytics", tabBarIcon: ({ color }) => <BarChart3 color={color} {...iconProps} /> }}
      />

      {/* Hide push-only routes inside this group */}
      <Tabs.Screen name="create-campaign" options={{ href: null }} />
    </Tabs>
  );
}
