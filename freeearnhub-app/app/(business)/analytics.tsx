import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BarChart3, RefreshCw, TrendingUp } from "lucide-react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type BusinessOverview = {
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
  spentBudget: number;
  remainingBudget: number;
  lockedBudget: number;
  todaySpend: number;
  averageCostPerApproval: number;
};

export default function BusinessAnalyticsScreen() {
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
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const spendSplit = useMemo(() => {
    const spent = Number(data?.spentBudget ?? 0);
    const remaining = Number(data?.remainingBudget ?? 0);
    const locked = Number(data?.lockedBudget ?? 0);
    const total = Math.max(1, spent + remaining);
    return {
      spentPct: Math.round((spent / total) * 100),
      remainingPct: Math.round((remaining / total) * 100),
      locked,
    };
  }, [data?.spentBudget, data?.remainingBudget, data?.lockedBudget]);

  return (
    <ScreenShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.left}>
            <BarChart3 color={colors.accent} size={18} />
            <Text style={styles.title}>Analytics</Text>
          </View>
          <Pressable onPress={load} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <RefreshCw color={colors.text} size={18} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.muted}>Loading...</Text> : null}

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <TrendingUp color={colors.accent} size={16} />
            <Text style={styles.cardTitle}>Budget Health</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barSpent, { width: `${Math.max(0, Math.min(100, spendSplit.spentPct))}%` }]} />
            <View style={[styles.barRemaining, { width: `${Math.max(0, Math.min(100, spendSplit.remainingPct))}%` }]} />
          </View>
          <View style={styles.legendRow}>
            <Text style={styles.legend}>Spent: Rs {Number(data?.spentBudget ?? 0).toFixed(0)}</Text>
            <Text style={styles.legend}>Remaining: Rs {Number(data?.remainingBudget ?? 0).toFixed(0)}</Text>
          </View>
          <Text style={styles.legendMuted}>Locked (pending/live): Rs {Number(data?.lockedBudget ?? 0).toFixed(0)}</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.mini}>
            <Text style={styles.miniLabel}>Today Spend</Text>
            <Text style={styles.miniValue}>Rs {Number(data?.todaySpend ?? 0).toFixed(0)}</Text>
          </View>
          <View style={styles.mini}>
            <Text style={styles.miniLabel}>Avg / Approval</Text>
            <Text style={styles.miniValue}>Rs {Number(data?.averageCostPerApproval ?? 0).toFixed(0)}</Text>
          </View>
          <View style={styles.mini}>
            <Text style={styles.miniLabel}>Pending Reviews</Text>
            <Text style={styles.miniValue}>{data?.pendingReviews ?? 0}</Text>
          </View>
          <View style={styles.mini}>
            <Text style={styles.miniLabel}>Active Applicants</Text>
            <Text style={styles.miniValue}>{data?.activeApplicants ?? 0}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Counts</Text>
          <View style={styles.countRow}>
            <Text style={styles.count}>Campaigns: {data?.totalCampaigns ?? 0}</Text>
            <Text style={styles.count}>Live: {data?.liveCampaigns ?? 0}</Text>
            <Text style={styles.count}>Pending: {data?.pendingCampaigns ?? 0}</Text>
          </View>
          <View style={styles.countRow}>
            <Text style={styles.count}>Jobs: {data?.totalJobs ?? 0}</Text>
            <Text style={styles.count}>Open: {data?.openJobs ?? 0}</Text>
            <Text style={styles.count}>Pending: {data?.pendingJobs ?? 0}</Text>
          </View>
          <View style={styles.countRow}>
            <Text style={styles.count}>Approvals: {data?.approvedSubmissions ?? 0}</Text>
            <Text style={styles.count}>Ready Applicants: {data?.readyApplicants ?? 0}</Text>
          </View>
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
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900" },
  iconBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { color: colors.text, fontWeight: "900" },
  barTrack: { height: 12, borderRadius: 999, backgroundColor: "#202A40", overflow: "hidden", flexDirection: "row" },
  barSpent: { height: "100%", backgroundColor: "#72FFB7" },
  barRemaining: { height: "100%", backgroundColor: colors.accent },
  legendRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  legend: { color: colors.textMuted, fontWeight: "800", fontSize: 12 },
  legendMuted: { color: colors.textMuted, fontWeight: "700", fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  mini: { width: "48%", borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 12, gap: 6 },
  miniLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  miniValue: { color: colors.text, fontSize: 16, fontWeight: "900" },
  countRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  count: { color: colors.textMuted, fontWeight: "800" },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
});
