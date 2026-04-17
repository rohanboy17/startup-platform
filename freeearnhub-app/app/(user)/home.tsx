import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Bell, BriefcaseBusiness, ClipboardCheck, MapPin, Wallet } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { colors } from "@/lib/theme";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth-store";

type Overview = {
  profile: { displayName: string; level: string; balance: number };
  metrics: {
    availableBalance: number;
    todayApprovedCount: number;
    approvedSubmissions: number;
    activeJobApplications: number;
    unreadNotifications: number;
  };
  progress: { percent: number; current: number; target: number | null };
  recentActivity: { id: string; kind: string; message: string; createdAt: string }[];
};

export default function UserHomeScreen() {
  const { user } = useAuth();
  const fade = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [fade]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<Overview>("/api/v2/users/me/overview");
      setData(resp.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const progress = data?.progress?.percent ?? 0;
  const firstName = useMemo(() => {
    const base = data?.profile?.displayName || user?.name || "User";
    return base.split(" ")[0] || base;
  }, [data?.profile?.displayName, user?.name]);

  return (
    <ScreenShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Animated.View style={{ opacity: fade }}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Hi, {firstName}</Text>
              <Text style={styles.subtitle}>Your work and hiring updates</Text>
            </View>
            <Pressable style={({ pressed }) => [styles.notify, pressed && styles.pressed]}>
              <Bell color={colors.text} size={17} />
              {data?.metrics?.unreadNotifications ? <View style={styles.dot} /> : null}
            </Pressable>
          </View>

          <LinearGradient colors={["#2C73FF", "#6D55FF"]} style={styles.walletCard}>
            <Text style={styles.walletLabel}>Available Balance</Text>
            <Text style={styles.walletAmount}>
              Rs {Number(data?.metrics?.availableBalance ?? 0).toFixed(2)}
            </Text>
            <View style={styles.walletActions}>
              <Pressable onPress={() => router.push("/(user)/wallet")} style={({ pressed }) => [styles.walletBtn, pressed && styles.pressed]}>
                <Wallet color="#09101F" size={16} />
                <Text style={styles.walletBtnText}>Wallet</Text>
              </Pressable>
              <Pressable onPress={() => router.push("/(user)/work")} style={({ pressed }) => [styles.walletBtnSecondary, pressed && styles.pressed]}>
                <BriefcaseBusiness color={colors.text} size={16} />
                <Text style={styles.walletBtnTextSecondary}>Work</Text>
              </Pressable>
            </View>
          </LinearGradient>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data?.metrics?.todayApprovedCount ?? 0}</Text>
              <Text style={styles.statLabel}>Today Approved</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data?.metrics?.approvedSubmissions ?? 0}</Text>
              <Text style={styles.statLabel}>Total Approved</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data?.metrics?.activeJobApplications ?? 0}</Text>
              <Text style={styles.statLabel}>Active Hiring</Text>
            </View>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Level Progress</Text>
              <Text style={styles.progressMeta}>
                {data?.profile?.level ?? "L1"} - {progress}%
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, progress))}%` }]} />
            </View>
          </View>

          <View style={styles.quickRow}>
            <Pressable onPress={() => router.push("/(user)/work")} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}>
              <BriefcaseBusiness color={colors.accent} size={18} />
              <Text style={styles.quickText}>Work</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(user)/jobs")} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}>
              <MapPin color={colors.accent} size={18} />
              <Text style={styles.quickText}>Jobs</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(user)/submissions")} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}>
              <ClipboardCheck color={colors.accent} size={18} />
              <Text style={styles.quickText}>Reviews</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Live Activity</Text>
            {loading ? <Text style={styles.muted}>Loading...</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {!loading && !error && (data?.recentActivity?.length ?? 0) === 0 ? (
              <Text style={styles.muted}>No recent updates.</Text>
            ) : null}
            {!loading && !error ? (
              <View style={styles.activityList}>
                {(data?.recentActivity ?? []).map((item) => (
                  <View key={item.id} style={styles.activityCard}>
                    <Text style={styles.activityKind}>{item.kind}</Text>
                    <Text style={styles.activityMsg} numberOfLines={2}>
                      {item.message}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <Pressable onPress={load} style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}>
            <Text style={styles.refreshText}>{loading ? "Refreshing..." : "Refresh"}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 28 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  title: { color: colors.text, fontSize: 23, fontWeight: "900" },
  subtitle: { color: colors.textMuted, marginTop: 4, fontWeight: "600" },
  notify: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#22304A",
    backgroundColor: "#121826",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { position: "absolute", top: 9, right: 10, width: 8, height: 8, borderRadius: 999, backgroundColor: "#FF6B8A" },
  walletCard: { borderRadius: 20, padding: 18, gap: 10, overflow: "hidden", marginBottom: 14 },
  walletLabel: { color: "#E9EDFF", fontWeight: "700" },
  walletAmount: { color: "#FFFFFF", fontSize: 36, fontWeight: "900" },
  walletActions: { flexDirection: "row", gap: 10 },
  walletBtn: { flex: 1, height: 42, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  walletBtnText: { color: "#09101F", fontWeight: "900" },
  walletBtnSecondary: { flex: 1, height: 42, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", backgroundColor: "rgba(12,19,40,0.35)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  walletBtnTextSecondary: { color: "#FFFFFF", fontWeight: "900" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 12, gap: 4 },
  statValue: { color: colors.text, fontSize: 18, fontWeight: "900" },
  statLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  progressCard: { borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 12, gap: 10, marginBottom: 14 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressTitle: { color: colors.text, fontWeight: "900" },
  progressMeta: { color: colors.textMuted, fontWeight: "700", fontSize: 12 },
  track: { height: 10, borderRadius: 999, backgroundColor: "#202A40", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999, backgroundColor: colors.accent },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  quickItem: { flex: 1, height: 62, borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center", gap: 6 },
  quickText: { color: colors.text, fontWeight: "800", fontSize: 12 },
  section: { borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 12, gap: 10 },
  sectionTitle: { color: colors.text, fontWeight: "900" },
  muted: { color: colors.textMuted, fontWeight: "600" },
  error: { color: colors.danger, fontWeight: "700" },
  activityList: { gap: 10 },
  activityCard: { borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", padding: 12, gap: 6 },
  activityKind: { color: colors.accent, fontWeight: "900", fontSize: 11 },
  activityMsg: { color: colors.text, fontWeight: "700", fontSize: 12, lineHeight: 18 },
  refresh: { marginTop: 12, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  refreshText: { color: colors.textMuted, fontWeight: "900" },
});
