import { Redirect, Tabs } from 'expo-router';
import { CreditCard, LayoutDashboard, ListChecks, User, Wallet } from 'lucide-react-native';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/lib/theme';
import { useAuth } from '@/store/auth-store';

const iconProps = { size: 20, strokeWidth: 2 };

export default function TabsLayout() {
  const { isHydrating, isAuthenticated } = useAuth();

  if (isHydrating) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: '#20283A',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: '#7B859D',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <LayoutDashboard color={color} {...iconProps} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => <ListChecks color={color} {...iconProps} />,
        }}
      />
      <Tabs.Screen
        name="earn"
        options={{
          title: 'Earn',
          tabBarIcon: ({ color }) => <CreditCard color={color} {...iconProps} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color }) => <Wallet color={color} {...iconProps} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} {...iconProps} />,
        }}
      />
    </Tabs>
  );
}
