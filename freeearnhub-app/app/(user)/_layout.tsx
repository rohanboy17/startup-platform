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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="submissions" />
      <Stack.Screen name="submission/[id]" />
      <Stack.Screen name="task/[id]" />
      <Stack.Screen name="job/[id]" />
    </Stack>
  );
}

