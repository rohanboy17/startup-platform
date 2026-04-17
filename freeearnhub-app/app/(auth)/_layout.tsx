import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/lib/theme';
import { useAuth } from '@/store/auth-store';

export default function AuthLayout() {
  const { isHydrating, isAuthenticated, user } = useAuth();

  if (isHydrating) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (isAuthenticated && user) {
    if (user.role === "USER") return <Redirect href="/(user)/home" />;
    if (user.role === "BUSINESS") return <Redirect href="/(business)/dashboard" />;
    return <Redirect href="/(common)/web-only" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
