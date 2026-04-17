import { router } from "expo-router";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Bell, BriefcaseBusiness, CreditCard, Gift, LogOut, Settings, ShieldCheck, Sparkles, UserRound } from "lucide-react-native";

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
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.grid}>
            <Pressable onPress={() => router.push("/(user)/notifications")} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
              <Bell color={colors.accent} size={18} />
              <Text style={styles.tileText}>Notifications</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(user)/withdrawals")} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
              <CreditCard color={colors.accent} size={18} />
              <Text style={styles.tileText}>Withdrawals</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(user)/job-applications")} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
              <BriefcaseBusiness color={colors.accent} size={18} />
              <Text style={styles.tileText}>Applications</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(user)/referrals")} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
              <Gift color={colors.accent} size={18} />
              <Text style={styles.tileText}>Referrals</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(user)/skills")} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
              <Sparkles color={colors.accent} size={18} />
              <Text style={styles.tileText}>Skills</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(user)/settings")} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
              <Settings color={colors.accent} size={18} />
              <Text style={styles.tileText}>Settings</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>
            Big buttons for fast access. Full profile editing stays on web for now.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Pressable onPress={logout} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
            <LogOut color="#09101F" size={16} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
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
  avatar: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "rgba(124,58,237,0.35)", backgroundColor: "rgba(124,58,237,0.18)", alignItems: "center", justifyContent: "center" },
  name: { color: colors.text, fontSize: 16, fontWeight: "900" },
  meta: { color: colors.textMuted, fontWeight: "700", marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { color: colors.text, fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "48%", height: 70, borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", alignItems: "center", justifyContent: "center", gap: 8 },
  tileText: { color: colors.text, fontWeight: "900", fontSize: 12 },
  logout: { height: 46, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  logoutText: { color: "#09101F", fontWeight: "900", fontSize: 14 },
  hint: { color: colors.textMuted, fontWeight: "600", fontSize: 12, lineHeight: 18 },
});
