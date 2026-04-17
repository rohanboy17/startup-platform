import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { colors } from "@/lib/theme";
import { useAuth } from "@/store/auth-store";

export default function UserLayout() {
  const { isHydrating, isAuthenticated, user } = useAuth();

  if (isHydrating) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!isAuthenticated || !user) return <Redirect href="/(auth)/login" />;
  if (user.role !== "USER") return <Redirect href="/" />;

  // Avoid explicit Stack.Screen registrations here. With route groups + dynamic routes, manual names
  // can easily drift and cause noisy "[Layout children]" warnings.
  return <Stack screenOptions={{ headerShown: false }} />;
}
