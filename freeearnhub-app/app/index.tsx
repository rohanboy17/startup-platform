import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/lib/theme';
import { useAuth } from '@/store/auth-store';

export default function IndexScreen() {
  const { isHydrating, isAuthenticated } = useAuth();

  if (isHydrating) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)/dashboard' : '/(auth)/login'} />;
}
