import { LinearGradient } from "expo-linear-gradient";
import { Bell, BriefcaseBusiness, Gift, Wallet } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ScreenShell } from "@/components/ScreenShell";
import { StatCard } from "@/components/StatCard";
import { colors } from "@/lib/theme";
import { useAuth } from "@/store/auth-store";

export default function DashboardScreen() {
  const { user } = useAuth();

  return (
    <ScreenShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Hi, {user?.name?.split(" ")[0] || "there"}</Text>
            <Text style={styles.subtitle}>Ready to make progress?</Text>
          </View>
          <View style={styles.notify}>
            <Bell color={colors.text} size={17} />
          </View>
        </View>

        <LinearGradient colors={["#2C73FF", "#6D55FF"]} style={styles.walletCard}>
          <Text style={styles.walletLabel}>Wallet Balance</Text>
          <Text style={styles.walletAmount}>Rs 245</Text>
          <View style={styles.walletActions}>
            <View style={styles.walletActionItem}>
              <Button title="Add" />
            </View>
            <View style={styles.walletActionItem}>
              <Button title="Withdraw" />
            </View>
          </View>
        </LinearGradient>

        <View style={styles.quickRow}>
          <View style={styles.quickItem}>
            <BriefcaseBusiness color={colors.accent} size={17} />
            <Text style={styles.quickText}>Tasks</Text>
          </View>
          <View style={styles.quickItem}>
            <Gift color={colors.accent} size={17} />
            <Text style={styles.quickText}>Earn</Text>
          </View>
          <View style={styles.quickItem}>
            <Wallet color={colors.accent} size={17} />
            <Text style={styles.quickText}>Wallet</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard label="Today Earn" value="Rs 32" />
          <StatCard label="Tasks Done" value="7" />
          <StatCard label="Level" value="4" />
        </View>

        <Card>
          <Text style={styles.sectionLabel}>Live Activity</Text>
          <Text style={styles.muted}>3 approvals in the last hour</Text>
        </Card>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 30 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.textMuted, marginTop: 4 },
  notify: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#27334B",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111726",
  },
  walletCard: {
    borderRadius: 22,
    padding: 18,
    gap: 10,
  },
  walletLabel: { color: '#E9EDFF', fontWeight: '600' },
  walletAmount: { color: '#FFFFFF', fontSize: 34, fontWeight: '800' },
  walletActions: { flexDirection: 'row', gap: 10 },
  walletActionItem: { flex: 1 },
  quickRow: {
    flexDirection: "row",
    gap: 10,
  },
  quickItem: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#23304B",
    backgroundColor: "#121826",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  quickText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 13,
  },
  statsGrid: { gap: 10 },
  sectionLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  muted: { color: colors.textMuted, marginTop: 8 },
});
