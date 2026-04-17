import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Activity, BadgeCheck, BriefcaseBusiness, ClipboardCheck, RefreshCw, Users, Wallet } from "lucide-react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { api } from "@/lib/api";
import { colors, gradients } from "@/lib/theme";

type BusinessOverview = {
  kycStatus: string;
  wallet: { balance: number; totalFunded: number; totalSpent: number; totalRefund: number };
  totalCampaigns: number;
  liveCampaigns: number;
  pendingCampaigns: number;
  totalJobs: number;
  openJobs: number;
  pendingJobs: number;
  approvedSubmissions: number;
  pendingReviews: number;
  readyApplicants: number;
  activeApplicants: number;
  activityFeed: { id: string; kind: string; message: string; createdAt: string }[];
};

export default function BusinessDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BusinessOverview | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<BusinessOverview>("/api/v2/business/overview");
      setData(resp.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title}>Business</Text>
          <Pressable onPress={load} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <RefreshCw color={colors.text} size={18} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.muted}>Loading...</Text> : null}

        <LinearGradient colors={gradients.primary} style={styles.walletCard}>
          <Text style={styles.walletLabel}>Business Wallet</Text>
          <Text style={styles.walletAmount}>Rs {Number(data?.wallet?.balance ?? 0).toFixed(2)}</Text>
          <Text style={styles.walletMeta}>KYC: {data?.kycStatus || "PENDING"}</Text>
          <View style={styles.walletMiniRow}>
            <View style={styles.mini}>
              <Text style={styles.miniLabel}>Funded</Text>
              <Text style={styles.miniValue}>Rs {Number(data?.wallet?.totalFunded ?? 0).toFixed(0)}</Text>
            </View>
            <View style={styles.mini}>
              <Text style={styles.miniLabel}>Spent</Text>
              <Text style={styles.miniValue}>Rs {Number(data?.wallet?.totalSpent ?? 0).toFixed(0)}</Text>
            </View>
            <View style={styles.mini}>
              <Text style={styles.miniLabel}>Refund</Text>
              <Text style={styles.miniValue}>Rs {Number(data?.wallet?.totalRefund ?? 0).toFixed(0)}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <ClipboardCheck color={colors.accent} size={16} />
            <Text style={styles.statValue}>{data?.liveCampaigns ?? 0}</Text>
            <Text style={styles.statLabel}>Live Campaigns</Text>
          </View>
          <View style={styles.statCard}>
            <BriefcaseBusiness color={colors.accent} size={16} />
            <Text style={styles.statValue}>{data?.openJobs ?? 0}</Text>
            <Text style={styles.statLabel}>Open Jobs</Text>
          </View>
          <View style={styles.statCard}>
            <BadgeCheck color={colors.accent} size={16} />
            <Text style={styles.statValue}>{data?.approvedSubmissions ?? 0}</Text>
            <Text style={styles.statLabel}>Approvals</Text>
          </View>
        </View>

        <View style={styles.quickRow}>
          <Pressable onPress={() => router.push("/(business)/campaign-applicants")} style={({ pressed }) => [styles.quick, pressed && styles.pressed]}>
            <ClipboardCheck color={colors.accent} size={18} />
            <Text style={styles.quickText}>Campaign Applicants</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/(business)/job-applicants")} style={({ pressed }) => [styles.quick, pressed && styles.pressed]}>
            <Users color={colors.accent} size={18} />
            <Text style={styles.quickText}>Job Applicants</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Activity color={colors.accent} size={16} />
            <Text style={styles.sectionTitle}>Activity</Text>
          </View>
          {(data?.activityFeed ?? []).map((item) => (
            <View key={item.id} style={styles.activityCard}>
              <Text style={styles.activityKind}>{item.kind}</Text>
              <Text style={styles.activityMsg} numberOfLines={2}>
                {item.message}
              </Text>
            </View>
          ))}
          {!loading && (data?.activityFeed?.length ?? 0) === 0 ? <Text style={styles.muted}>No recent activity.</Text> : null}
        </View>

        <View style={styles.hintCard}>
          <Wallet color={colors.textMuted} size={16} />
          <Text style={styles.hintText}>
            Business funding and Razorpay checkout are available on web. Mobile wallet is view-first for now.
          </Text>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.text, fontSize: 22, fontWeight: "900" },
  iconBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  walletCard: { borderRadius: 20, padding: 18, gap: 8, overflow: "hidden" },
  walletLabel: { color: "#E9EDFF", fontWeight: "800" },
  walletAmount: { color: "#FFFFFF", fontSize: 34, fontWeight: "900" },
  walletMeta: { color: "rgba(255,255,255,0.85)", fontWeight: "700" },
  walletMiniRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  mini: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", backgroundColor: "rgba(12,19,40,0.35)", padding: 10, gap: 4 },
  miniLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "800" },
  miniValue: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 12, gap: 6 },
  statValue: { color: colors.text, fontSize: 18, fontWeight: "900" },
  statLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  quickRow: { flexDirection: "row", gap: 10 },
  quick: { flex: 1, height: 74, borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 12, justifyContent: "center", gap: 8 },
  quickText: { color: colors.text, fontWeight: "900", fontSize: 12 },
  section: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { color: colors.text, fontWeight: "900" },
  activityCard: { borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", padding: 12, gap: 6 },
  activityKind: { color: colors.accent, fontWeight: "900", fontSize: 11 },
  activityMsg: { color: colors.text, fontWeight: "700", fontSize: 12, lineHeight: 18 },
  hintCard: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10, flexDirection: "row" },
  hintText: { color: colors.textMuted, fontWeight: "700", fontSize: 12, lineHeight: 18, flex: 1 },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
});
