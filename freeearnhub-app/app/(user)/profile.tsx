import { StyleSheet, Text, View, Pressable } from "react-native";
import { LogOut, ShieldCheck, UserRound } from "lucide-react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { colors } from "@/lib/theme";
import { useAuth } from "@/store/auth-store";

export default function UserProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <ScreenShell>
      <View style={styles.screen}>
        <View style={styles.card}>
          <View style={styles.head}>
            <View style={styles.avatar}>
              <UserRound color={colors.accent} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{user?.name || "User"}</Text>
              <Text style={styles.meta}>{user?.email}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <ShieldCheck color={colors.textMuted} size={16} />
            <Text style={styles.meta}>Role: {user?.role}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Pressable onPress={logout} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
            <LogOut color="#09101F" size={16} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
          <Text style={styles.hint}>
            Profile editing, skills, and preferences can be managed from the web dashboard (for now).
          </Text>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 14 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "rgba(69,225,255,0.25)", backgroundColor: "rgba(69,225,255,0.10)", alignItems: "center", justifyContent: "center" },
  name: { color: colors.text, fontSize: 16, fontWeight: "900" },
  meta: { color: colors.textMuted, fontWeight: "700", marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { color: colors.text, fontWeight: "900" },
  logout: { height: 46, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  logoutText: { color: "#09101F", fontWeight: "900", fontSize: 14 },
  hint: { color: colors.textMuted, fontWeight: "600", fontSize: 12, lineHeight: 18 },
});

