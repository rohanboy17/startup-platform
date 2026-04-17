import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Bell, BriefcaseBusiness, ClipboardCheck, MapPin, Wallet } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { api } from "@/lib/api";
import { colors, gradients } from "@/lib/theme";
import { useAuth } from "@/store/auth-store";

type Overview = {
  profile: { displayName: string; level: string; balance: number };
  metrics: {
    availableBalance: number;
    todayApprovedCount: number;
    approvedSubmissions: number;
    activeJobApplications: number;
    unreadNotifications: number;
    pendingWithdrawalAmount: number;
  };
  progress: { percent: number; current: number; target: number | null };
  recentActivity: { id: string; kind: string; message: string; createdAt: string }[];
};

type SubmissionStage = "APPROVED" | "ADMIN_REJECTED" | "MANAGER_REJECTED" | "PENDING_ADMIN" | "PENDING_MANAGER";
type SubmissionList = { submissions: { id: string; stage: SubmissionStage }[] };

export default function UserHomeScreen() {
  const { user } = useAuth();
  const fade = useRef(new Animated.Value(0)).current;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Overview | null>(null);
  const [subCounts, setSubCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [fade]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [overviewResp, submissionsResp] = await Promise.all([
        api.get<Overview>("/api/v2/users/me/overview"),
        api.get<SubmissionList>("/api/v2/users/me/submissions"),
      ]);
      setData(overviewResp.data);
      const submissions = submissionsResp.data.submissions || [];
      const approved = submissions.filter((s) => s.stage === "APPROVED").length;
      const rejected = submissions.filter((s) => s.stage === "ADMIN_REJECTED" || s.stage === "MANAGER_REJECTED").length;
      const pending = submissions.filter((s) => s.stage === "PENDING_ADMIN" || s.stage === "PENDING_MANAGER").length;
      setSubCounts({ pending, approved, rejected });
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

  const initials = useMemo(() => {
    const base = (data?.profile?.displayName || user?.name || "U").trim();
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase();
    return `${parts[0]?.[0] || "U"}${parts[1]?.[0] || ""}`.toUpperCase();
  }, [data?.profile?.displayName, user?.name]);

  return (
    <ScreenShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Animated.View style={{ opacity: fade }}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View>
                <Text style={styles.title}>Hi, {firstName}</Text>
                <Text style={styles.subtitle}>Work stages and hiring updates</Text>
              </View>
            </View>
            <Pressable onPress={() => router.push("/(user)/profile")} style={({ pressed }) => [styles.notify, pressed && styles.pressed]}>
              <Bell color={colors.text} size={17} />
              {data?.metrics?.unreadNotifications ? <View style={styles.dot} /> : null}
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading ? <Text style={styles.muted}>Loading...</Text> : null}

          <LinearGradient colors={gradients.primary} style={styles.walletCard}>
            <Text style={styles.walletLabel}>Available Balance</Text>
            <Text style={styles.walletAmount}>Rs {Number(data?.metrics?.availableBalance ?? 0).toFixed(2)}</Text>
            <View style={styles.walletActions}>
              <Pressable onPress={() => router.push("/(user)/wallet")} style={({ pressed }) => [styles.walletBtn, pressed && styles.pressed]}>
                <Wallet color="#0B0F1A" size={16} />
                <Text style={styles.walletBtnText}>Withdraw</Text>
              </Pressable>
              <Pressable onPress={() => router.push("/(user)/work")} style={({ pressed }) => [styles.walletBtnSecondary, pressed && styles.pressed]}>
                <BriefcaseBusiness color="#FFFFFF" size={16} />
                <Text style={styles.walletBtnTextSecondary}>Find Work</Text>
              </Pressable>
            </View>
            {Number(data?.metrics?.pendingWithdrawalAmount ?? 0) > 0 ? (
              <Text style={styles.walletHint}>
                Pending payout: Rs {Number(data?.metrics?.pendingWithdrawalAmount ?? 0).toFixed(0)}
              </Text>
            ) : null}
          </LinearGradient>

          <View style={styles.quickGrid}>
            <Pressable onPress={() => router.push("/(user)/work")} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}>
              <BriefcaseBusiness color={colors.accent} size={18} />
              <Text style={styles.quickText}>Work</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(user)/jobs")} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}>
              <MapPin color={colors.accent} size={18} />
              <Text style={styles.quickText}>Jobs</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(user)/wallet")} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}>
              <Wallet color={colors.accent} size={18} />
              <Text style={styles.quickText}>Wallet</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(user)/submissions")} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}>
              <ClipboardCheck color={colors.accent} size={18} />
              <Text style={styles.quickText}>Reviews</Text>
            </Pressable>
          </View>

          <View style={styles.statusRow}>
            <Pressable onPress={() => router.push("/(user)/submissions")} style={({ pressed }) => [styles.statusCard, styles.statusPending, pressed && styles.pressed]}>
              <Text style={styles.statusValue}>{subCounts.pending}</Text>
              <Text style={styles.statusLabel}>Under Review</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(user)/submissions")} style={({ pressed }) => [styles.statusCard, styles.statusApproved, pressed && styles.pressed]}>
              <Text style={styles.statusValue}>{subCounts.approved}</Text>
              <Text style={styles.statusLabel}>Approved</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(user)/submissions")} style={({ pressed }) => [styles.statusCard, styles.statusRejected, pressed && styles.pressed]}>
              <Text style={styles.statusValue}>{subCounts.rejected}</Text>
              <Text style={styles.statusLabel}>Rejected</Text>
            </Pressable>
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

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Live Activity</Text>
              <Pressable onPress={load} style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}>
                <Text style={styles.refreshText}>Refresh</Text>
              </Pressable>
            </View>
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
        </Animated.View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.35)",
    backgroundColor: "rgba(124,58,237,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.text, fontWeight: "900" },
  title: { color: colors.text, fontSize: 22, fontWeight: "900" },
  subtitle: { color: colors.textMuted, marginTop: 4, fontWeight: "600" },
  notify: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#22304A",
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { position: "absolute", top: 9, right: 10, width: 8, height: 8, borderRadius: 999, backgroundColor: colors.danger },

  walletCard: { borderRadius: 20, padding: 18, gap: 10, overflow: "hidden" },
  walletLabel: { color: "rgba(255,255,255,0.90)", fontWeight: "700" },
  walletAmount: { color: "#FFFFFF", fontSize: 36, fontWeight: "900" },
  walletActions: { flexDirection: "row", gap: 10 },
  walletBtn: { flex: 1, height: 42, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  walletBtnText: { color: "#0B0F1A", fontWeight: "900" },
  walletBtnSecondary: { flex: 1, height: 42, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", backgroundColor: "rgba(0,0,0,0.18)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  walletBtnTextSecondary: { color: "#FFFFFF", fontWeight: "900" },
  walletHint: { color: "rgba(255,255,255,0.85)", fontWeight: "700" },

  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickItem: { width: "48%", height: 70, borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: colors.card, alignItems: "center", justifyContent: "center", gap: 8 },
  quickText: { color: colors.text, fontWeight: "800", fontSize: 12 },

  statusRow: { flexDirection: "row", gap: 10 },
  statusCard: { flex: 1, height: 64, borderRadius: 18, padding: 12, justifyContent: "center", gap: 4, borderWidth: 1 },
  statusValue: { color: colors.text, fontSize: 18, fontWeight: "900" },
  statusLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  statusPending: { backgroundColor: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.30)" },
  statusApproved: { backgroundColor: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.30)" },
  statusRejected: { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.30)" },

  progressCard: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: colors.card, padding: 14, gap: 10 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressTitle: { color: colors.text, fontWeight: "900" },
  progressMeta: { color: colors.textMuted, fontWeight: "700", fontSize: 12 },
  track: { height: 10, borderRadius: 999, backgroundColor: "#202A40", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999, backgroundColor: colors.accent },

  section: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: colors.card, padding: 14, gap: 10 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: colors.text, fontWeight: "900" },
  refresh: { height: 34, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", alignItems: "center", justifyContent: "center" },
  refreshText: { color: colors.textMuted, fontWeight: "900", fontSize: 12 },
  activityList: { gap: 10 },
  activityCard: { borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", padding: 12, gap: 6 },
  activityKind: { color: colors.accent, fontWeight: "900", fontSize: 11 },
  activityMsg: { color: colors.text, fontWeight: "700", fontSize: 12, lineHeight: 18 },

  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
});

