import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/lib/theme';
import { useAuth } from '@/store/auth-store';

export default function AuthLayout() {
  const { isHydrating, isAuthenticated } = useAuth();

  if (isHydrating) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
