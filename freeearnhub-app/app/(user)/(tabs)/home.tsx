import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { BadgeCheck, Bell, BriefcaseBusiness, CheckCircle2, ClipboardCheck, CreditCard, Flame, MapPin, TrendingUp, Wallet } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { api } from "@/lib/api";
import { colors, gradients } from "@/lib/theme";
import { useAuth } from "@/store/auth-store";

type Overview = {
  profile: { displayName: string; level: string; balance: number; dailyApproved?: number; totalApproved?: number };
  engagement?: { timezone?: string; streakCount: number; newApprovals: number; dayKey?: string };
  metrics: {
    availableBalance: number;
    todayApprovedCount: number;
    approvedSubmissions: number;
    activeJobApplications: number;
    unreadNotifications: number;
    pendingWithdrawalAmount: number;
  };
  progress: { percent: number; current: number; target: number | null };
  levelBenefits?: {
    level: string;
    title?: string;
    description?: string;
    isCurrent?: boolean;
    commissionRate?: number;
    walletShareRate?: number;
  }[];
  recentActivity: { id: string; kind: string; message: string; createdAt: string }[];
};

type SubmissionStage = "APPROVED" | "ADMIN_REJECTED" | "MANAGER_REJECTED" | "PENDING_ADMIN" | "PENDING_MANAGER";
type SubmissionList = { submissions: { id: string; stage: SubmissionStage }[] };

function parseAmount(message: string) {
  const m = message.match(/(?:INR|Rs)\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function maskId(input: string) {
  const tail = (input || "").replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase();
  return `U**** ${tail || "XXXX"}`;
}

export default function UserHomeScreen() {
  const { user } = useAuth();
  const fade = useRef(new Animated.Value(0)).current;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Overview | null>(null);
  const [subCounts, setSubCounts] = useState({
    pending: 0,
    pendingManager: 0,
    pendingAdmin: 0,
    approved: 0,
    rejected: 0,
  });
  const [error, setError] = useState("");
  const [rewardToast, setRewardToast] = useState<{ title: string; subtitle: string } | null>(null);

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
      const pendingManager = submissions.filter((s) => s.stage === "PENDING_MANAGER").length;
      const pendingAdmin = submissions.filter((s) => s.stage === "PENDING_ADMIN").length;
      const pending = pendingManager + pendingAdmin;
      setSubCounts({ pending, pendingManager, pendingAdmin, approved, rejected });

      const delta = Number(overviewResp.data.engagement?.newApprovals ?? 0);
      if (delta > 0) {
        setRewardToast({
          title: "Approval received",
          subtitle: `${delta} submission${delta === 1 ? "" : "s"} moved to approved. Wallet credit is recorded after approval.`,
        });
        setTimeout(() => setRewardToast(null), 2600);
      }
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

  const approvalRate = useMemo(() => {
    const total = subCounts.approved + subCounts.rejected;
    if (total <= 0) return null;
    return Math.max(0, Math.min(100, Math.round((subCounts.approved / total) * 100)));
  }, [subCounts.approved, subCounts.rejected]);

  const dailyGoalTarget = 10;
  const dailyApproved = Number(data?.profile?.dailyApproved ?? data?.metrics?.todayApprovedCount ?? 0);
  const dailyGoalPct = Math.max(0, Math.min(100, Math.round((dailyApproved / Math.max(1, dailyGoalTarget)) * 100)));

  const levelCard = useMemo(() => {
    const current = data?.profile?.level || "L1";
    const benefits = data?.levelBenefits || [];
    const idx = benefits.findIndex((b) => b.level === current || b.isCurrent);
    const currentBenefit = idx >= 0 ? benefits[idx] : null;
    const nextBenefit = idx >= 0 && idx < benefits.length - 1 ? benefits[idx + 1] : null;
    const nextTitle = nextBenefit?.title || "Next level benefits";
    const nextDesc = nextBenefit?.description || "Keep completing approved work to level up.";
    const share = typeof currentBenefit?.walletShareRate === "number" ? `${Math.round(currentBenefit.walletShareRate * 100)}% share` : null;
    return { current, nextBenefit, nextTitle, nextDesc, share };
  }, [data?.levelBenefits, data?.profile?.level]);

  const recentPayouts = useMemo(() => {
    const rows = (data?.recentActivity ?? []).filter((a) => a.kind === "EARNING");
    return rows.slice(0, 5).map((a) => ({
      id: a.id,
      who: maskId(a.id),
      amount: parseAmount(a.message),
      createdAt: a.createdAt,
    }));
  }, [data?.recentActivity]);

  const streak = data?.engagement?.streakCount ?? 1;

  return (
    <ScreenShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Animated.View style={{ opacity: fade }}>
          {rewardToast ? (
            <View style={styles.rewardToast}>
              <View style={styles.rewardIcon}>
                <CheckCircle2 color={colors.success} size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rewardTitle}>{rewardToast.title}</Text>
                <Text style={styles.rewardSub} numberOfLines={2}>
                  {rewardToast.subtitle}
                </Text>
              </View>
            </View>
          ) : null}

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
            <Pressable onPress={() => router.push("/(user)/notifications")} style={({ pressed }) => [styles.notify, pressed && styles.pressed]}>
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
              <Pressable onPress={() => router.push("/(user)/(tabs)/wallet")} style={({ pressed }) => [styles.walletBtn, pressed && styles.pressed]}>
                <Wallet color="#0B0F1A" size={16} />
                <Text style={styles.walletBtnText}>Withdraw</Text>
              </Pressable>
              <Pressable onPress={() => router.push("/(user)/(tabs)/work")} style={({ pressed }) => [styles.walletBtnSecondary, pressed && styles.pressed]}>
                <BriefcaseBusiness color="#FFFFFF" size={16} />
                <Text style={styles.walletBtnTextSecondary}>Find Work</Text>
              </Pressable>
            </View>
            <View style={styles.walletHintRow}>
              <View style={styles.streakPill}>
                <Flame color="#FFE3A2" size={14} />
                <Text style={styles.streakText}>{streak}-day streak</Text>
              </View>
              <Text style={styles.walletHint}>
                {Number(data?.metrics?.pendingWithdrawalAmount ?? 0) > 0
                  ? `Pending payout: Rs ${Number(data?.metrics?.pendingWithdrawalAmount ?? 0).toFixed(0)}`
                  : "Payouts are tracked after approval"}
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.quickGrid}>
            <Pressable onPress={() => router.push("/(user)/(tabs)/work")} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}>
              <BriefcaseBusiness color={colors.accent} size={18} />
              <Text style={styles.quickText}>Work</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(user)/(tabs)/jobs")} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}>
              <MapPin color={colors.accent} size={18} />
              <Text style={styles.quickText}>Jobs</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(user)/(tabs)/wallet")} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}>
              <Wallet color={colors.accent} size={18} />
              <Text style={styles.quickText}>Wallet</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(user)/submissions")} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}>
              <ClipboardCheck color={colors.accent} size={18} />
              <Text style={styles.quickText}>Reviews</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(user)/job-applications")} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}>
              <BriefcaseBusiness color={colors.accent} size={18} />
              <Text style={styles.quickText}>Applications</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(user)/withdrawals")} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}>
              <CreditCard color={colors.accent} size={18} />
              <Text style={styles.quickText}>Payouts</Text>
            </Pressable>
          </View>

          <View style={styles.pipeline}>
            <Text style={styles.pipelineTitle}>Work Pipeline Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pipelineRow}>
              <View style={[styles.pipeCard, styles.pipeUnderReview]}>
                <Text style={styles.pipeValue}>{subCounts.pending}</Text>
                <Text style={styles.pipeLabel}>Under Review</Text>
              </View>
              <View style={[styles.pipeCard, styles.pipeManager]}>
                <Text style={styles.pipeValue}>{subCounts.pendingManager}</Text>
                <Text style={styles.pipeLabel}>Manager Stage</Text>
              </View>
              <View style={[styles.pipeCard, styles.pipeAdmin]}>
                <Text style={styles.pipeValue}>{subCounts.pendingAdmin}</Text>
                <Text style={styles.pipeLabel}>Admin Stage</Text>
              </View>
              <View style={[styles.pipeCard, styles.pipeApproved]}>
                <Text style={styles.pipeValue}>{subCounts.approved}</Text>
                <Text style={styles.pipeLabel}>Approved</Text>
              </View>
              <View style={[styles.pipeCard, styles.pipeRejected]}>
                <Text style={styles.pipeValue}>{subCounts.rejected}</Text>
                <Text style={styles.pipeLabel}>Rejected</Text>
              </View>
            </ScrollView>
            <Pressable onPress={() => router.push("/(user)/submissions")} style={({ pressed }) => [styles.pipeCta, pressed && styles.pressed]}>
              <Text style={styles.pipeCtaText}>Open Reviews</Text>
            </Pressable>
          </View>

          <View style={styles.retentionRow}>
            <View style={styles.retentionCard}>
              <View style={styles.retentionHead}>
                <TrendingUp color={colors.accentAlt} size={16} />
                <Text style={styles.retentionTitle}>Approval Rate</Text>
              </View>
              <Text style={styles.retentionValue}>{approvalRate == null ? "--" : `${approvalRate}%`}</Text>
              <View style={styles.miniTrack}>
                <View style={[styles.miniFill, { width: `${approvalRate ?? 0}%` }]} />
              </View>
              <Text style={styles.retentionMeta}>Approved vs rejected</Text>
            </View>

            <View style={styles.retentionCard}>
              <View style={styles.retentionHead}>
                <BadgeCheck color={colors.accent} size={16} />
                <Text style={styles.retentionTitle}>Daily Goal</Text>
              </View>
              <Text style={styles.retentionValue}>
                {dailyApproved}/{dailyGoalTarget}
              </Text>
              <View style={styles.miniTrack}>
                <View style={[styles.miniFill, { width: `${dailyGoalPct}%` }]} />
              </View>
              <Text style={styles.retentionMeta}>Approved today</Text>
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

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Level Benefits</Text>
            </View>
            <View style={styles.levelRow}>
              <View style={styles.levelPill}>
                <Text style={styles.levelLabel}>Current</Text>
                <Text style={styles.levelValue}>{levelCard.current}</Text>
              </View>
              <View style={styles.levelBody}>
                <Text style={styles.levelNext} numberOfLines={1}>
                  {levelCard.nextBenefit ? `${levelCard.nextBenefit.level}: ${levelCard.nextTitle}` : levelCard.nextTitle}
                </Text>
                <Text style={styles.levelMeta} numberOfLines={2}>
                  {levelCard.nextDesc}
                </Text>
                <Text style={styles.levelMeta} numberOfLines={1}>
                  {levelCard.share ? `Earnings share: ${levelCard.share}` : "Earnings share updates by level"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Recent Payouts</Text>
              <Pressable onPress={load} style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}>
                <Text style={styles.refreshText}>Refresh</Text>
              </Pressable>
            </View>
            {recentPayouts.length === 0 ? (
              <Text style={styles.muted}>No payout credits yet.</Text>
            ) : (
              <View style={styles.payoutList}>
                {recentPayouts.map((p) => (
                  <View key={p.id} style={styles.payoutRow}>
                    <View style={styles.payoutIcon}>
                      <CheckCircle2 color={colors.success} size={16} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.payoutWho}>{p.who}</Text>
                      <Text style={styles.payoutMeta}>{new Date(p.createdAt).toLocaleString()}</Text>
                    </View>
                    <Text style={styles.payoutAmt}>{p.amount == null ? "Rs --" : `Rs ${p.amount.toFixed(0)}`}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Live Activity</Text>
              <Pressable onPress={load} style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}>
                <Text style={styles.refreshText}>Refresh</Text>
              </Pressable>
            </View>
            {!loading && !error && (data?.recentActivity?.length ?? 0) === 0 ? <Text style={styles.muted}>No recent updates.</Text> : null}
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

  rewardToast: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 18, borderWidth: 1, borderColor: "rgba(34,197,94,0.28)", backgroundColor: "rgba(34,197,94,0.10)", padding: 12 },
  rewardIcon: { width: 34, height: 34, borderRadius: 14, borderWidth: 1, borderColor: "rgba(34,197,94,0.35)", backgroundColor: "rgba(34,197,94,0.12)", alignItems: "center", justifyContent: "center" },
  rewardTitle: { color: colors.text, fontWeight: "900" },
  rewardSub: { color: colors.textMuted, marginTop: 4, fontWeight: "700", fontSize: 12, lineHeight: 18 },

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
  walletHintRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  walletHint: { color: "rgba(255,255,255,0.85)", fontWeight: "700", flexShrink: 1, textAlign: "right" },
  streakPill: { height: 30, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,227,162,0.35)", backgroundColor: "rgba(255,227,162,0.12)", flexDirection: "row", alignItems: "center", gap: 6 },
  streakText: { color: "#FFF2CC", fontWeight: "900", fontSize: 12 },

  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickItem: { width: "48%", height: 70, borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: colors.card, alignItems: "center", justifyContent: "center", gap: 8 },
  quickText: { color: colors.text, fontWeight: "800", fontSize: 12 },

  pipeline: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: colors.card, padding: 14, gap: 12 },
  pipelineTitle: { color: colors.text, fontWeight: "900" },
  pipelineRow: { gap: 10, paddingRight: 10 },
  pipeCard: { width: 128, height: 74, borderRadius: 18, borderWidth: 1, padding: 12, justifyContent: "center", gap: 4 },
  pipeValue: { color: colors.text, fontSize: 18, fontWeight: "900" },
  pipeLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  pipeUnderReview: { backgroundColor: "rgba(245,158,11,0.10)", borderColor: "rgba(245,158,11,0.30)" },
  pipeManager: { backgroundColor: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.22)" },
  pipeAdmin: { backgroundColor: "rgba(79,70,229,0.10)", borderColor: "rgba(79,70,229,0.28)" },
  pipeApproved: { backgroundColor: "rgba(34,197,94,0.10)", borderColor: "rgba(34,197,94,0.28)" },
  pipeRejected: { backgroundColor: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.28)" },
  pipeCta: { height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", alignItems: "center", justifyContent: "center" },
  pipeCtaText: { color: colors.textMuted, fontWeight: "900" },

  retentionRow: { flexDirection: "row", gap: 10 },
  retentionCard: { flex: 1, borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: colors.card, padding: 14, gap: 8 },
  retentionHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  retentionTitle: { color: colors.text, fontWeight: "900", fontSize: 12 },
  retentionValue: { color: colors.text, fontWeight: "900", fontSize: 22 },
  retentionMeta: { color: colors.textMuted, fontWeight: "700", fontSize: 11 },
  miniTrack: { height: 8, borderRadius: 999, backgroundColor: "#202A40", overflow: "hidden" },
  miniFill: { height: "100%", borderRadius: 999, backgroundColor: colors.accent },

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

  levelRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  levelPill: { width: 84, borderRadius: 16, borderWidth: 1, borderColor: "rgba(124,58,237,0.35)", backgroundColor: "rgba(124,58,237,0.18)", padding: 12, gap: 6 },
  levelLabel: { color: colors.textMuted, fontWeight: "800", fontSize: 11 },
  levelValue: { color: colors.text, fontWeight: "900", fontSize: 18 },
  levelBody: { flex: 1, gap: 4 },
  levelNext: { color: colors.text, fontWeight: "900" },
  levelMeta: { color: colors.textMuted, fontWeight: "700", fontSize: 12, lineHeight: 18 },

  payoutList: { gap: 10 },
  payoutRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", padding: 12 },
  payoutIcon: { width: 30, height: 30, borderRadius: 12, borderWidth: 1, borderColor: "rgba(34,197,94,0.30)", backgroundColor: "rgba(34,197,94,0.10)", alignItems: "center", justifyContent: "center" },
  payoutWho: { color: colors.text, fontWeight: "900", fontSize: 12 },
  payoutMeta: { color: colors.textMuted, fontWeight: "700", fontSize: 11, marginTop: 4 },
  payoutAmt: { color: colors.success, fontWeight: "900" },
  activityList: { gap: 10 },
  activityCard: { borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", padding: 12, gap: 6 },
  activityKind: { color: colors.accent, fontWeight: "900", fontSize: 11 },
  activityMsg: { color: colors.text, fontWeight: "700", fontSize: 12, lineHeight: 18 },

  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
});
