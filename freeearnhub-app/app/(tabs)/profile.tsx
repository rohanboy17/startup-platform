import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ScreenShell } from "@/components/ScreenShell";
import { colors } from "@/lib/theme";
import { useAuth } from "@/store/auth-store";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <ScreenShell>
      <View style={styles.screen}>
        <Card>
          <Text style={styles.name}>{user?.name || "User"}</Text>
          <Text style={styles.meta}>{user?.email}</Text>
          <Text style={styles.meta}>Role: {user?.role || "USER"}</Text>
          <View style={styles.action}>
            <Button title="Logout" onPress={logout} />
          </View>
        </Card>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 16 },
  name: { color: colors.text, fontSize: 22, fontWeight: '800' },
  meta: { color: colors.textMuted, marginTop: 6 },
  action: { marginTop: 16 },
});
