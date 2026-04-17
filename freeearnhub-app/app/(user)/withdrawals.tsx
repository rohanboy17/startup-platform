import { Stack, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type WithdrawalRow = {
  id: string;
  amount: number;
  upiId: string | null;
  upiName: string | null;
  status: string;
  adminNote: string | null;
  isEmergency: boolean;
  createdAt: string;
};

type WithdrawalsResp = {
  balance: number;
  defaults: { upiId: string | null; upiName: string | null };
  metrics: {
    pendingAmount: number;
    approvedAmount: number;
    rejectedCount: number;
    totalRequests: number;
    emergencyRemaining: number;
    emergencyUsed: number;
  };
  withdrawals: WithdrawalRow[];
};

function statusTone(status: string) {
  if (status === "APPROVED") return colors.success;
  if (status === "REJECTED") return colors.danger;
  return colors.warning;
}

function statusIcon(status: string) {
  if (status === "APPROVED") return <CheckCircle2 color={colors.success} size={16} />;
  if (status === "REJECTED") return <AlertTriangle color={colors.danger} size={16} />;
  return <Clock color={colors.warning} size={16} />;
}

export default function UserWithdrawalsScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WithdrawalsResp | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<WithdrawalsResp>("/api/v2/users/me/withdrawals");
      setData(resp.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load withdrawals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const headline = useMemo(() => {
    const pending = Number(data?.metrics?.pendingAmount ?? 0);
    if (pending > 0) return `Pending: Rs ${pending.toFixed(0)}`;
    return "Withdrawal history";
  }, [data?.metrics?.pendingAmount]);

  return (
    <ScreenShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Withdrawals</Text>
            <Text style={styles.sub}>{headline}</Text>
          </View>
          <Pressable onPress={load} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <RefreshCw color={colors.text} size={18} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.muted}>Loading...</Text> : null}

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>Rs {Number(data?.metrics?.approvedAmount ?? 0).toFixed(0)}</Text>
            <Text style={styles.metricLabel}>Approved</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>Rs {Number(data?.metrics?.pendingAmount ?? 0).toFixed(0)}</Text>
            <Text style={styles.metricLabel}>Pending</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{data?.metrics?.rejectedCount ?? 0}</Text>
            <Text style={styles.metricLabel}>Rejected</Text>
          </View>
        </View>

        <View style={styles.tip}>
          <Text style={styles.tipTitle}>Tip</Text>
          <Text style={styles.tipText}>
            Withdrawals are reviewed by admin. Approved withdrawals are processed under platform rules.
          </Text>
        </View>

        {!loading && !error && (data?.withdrawals?.length ?? 0) === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No withdrawal requests</Text>
            <Text style={styles.emptyText}>When you request a payout from Wallet, it will appear here.</Text>
          </View>
        ) : null}

        <View style={styles.list}>
          {(data?.withdrawals ?? []).map((w) => (
            <View key={w.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconWrap}>{statusIcon(w.status)}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    Rs {Number(w.amount || 0).toFixed(0)}{" "}
                    {w.isEmergency ? <Text style={styles.emergency}>Emergency</Text> : null}
                  </Text>
                  <Text style={styles.cardMsg} numberOfLines={2}>
                    {w.upiId ? `UPI: ${w.upiId}` : "UPI not provided"}
                    {w.adminNote ? ` | Note: ${w.adminNote}` : ""}
                  </Text>
                </View>
                <Text style={[styles.badge, { color: statusTone(w.status) }]}>{w.status}</Text>
              </View>
              <Text style={styles.cardMeta}>{new Date(w.createdAt).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { height: 36, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  backText: { color: colors.textMuted, fontWeight: "900", fontSize: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900" },
  sub: { color: colors.textMuted, fontWeight: "700", marginTop: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  metricsRow: { flexDirection: "row", gap: 10 },
  metric: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 12, gap: 6 },
  metricValue: { color: colors.text, fontSize: 16, fontWeight: "900" },
  metricLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  tip: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 8 },
  tipTitle: { color: colors.text, fontWeight: "900" },
  tipText: { color: colors.textMuted, fontWeight: "700", lineHeight: 18 },
  empty: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 16, gap: 10 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  emptyText: { color: colors.textMuted, fontWeight: "700", lineHeight: 18 },
  list: { gap: 12 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  iconWrap: { width: 34, height: 34, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.text, fontWeight: "900" },
  emergency: { color: colors.warning, fontWeight: "900" },
  cardMsg: { color: colors.textMuted, fontWeight: "700", marginTop: 6, lineHeight: 18, fontSize: 12 },
  badge: { fontWeight: "900", fontSize: 11, marginTop: 2 },
  cardMeta: { color: colors.textMuted, fontWeight: "700", fontSize: 11 },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
});
