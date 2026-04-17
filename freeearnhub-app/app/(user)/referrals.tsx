import { Stack, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { RefreshCw, Ticket } from "lucide-react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type ReferralInvite = {
  id: string;
  status: string;
  createdAt: string;
  referredUser: { id: string; name: string; createdAt: string };
};

type CoinTx = { id: string; amount: number; type: string; source: string; note: string | null; createdAt: string };

type ReferralsResp = {
  summary: {
    coinBalance: number;
    perkCreditBalance: number;
    totalInvites: number;
    rewardedInvites: number;
    pendingInvites: number;
    monthlyRedeemedCoins: number;
    monthlyPerkCreditsGranted: number;
  };
  referral: { code: string; link: string };
  invites: ReferralInvite[];
  transactions: CoinTx[];
};

export default function UserReferralsScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReferralsResp | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<ReferralsResp>("/api/v2/users/me/referrals");
      setData(resp.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load referrals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const code = data?.referral?.code || "--";
  const link = data?.referral?.link || "";
  const headline = useMemo(() => {
    if (!data) return "Invite friends and earn";
    return `${data.summary.rewardedInvites}/${data.summary.totalInvites} rewarded`;
  }, [data]);

  return (
    <ScreenShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Referrals</Text>
            <Text style={styles.sub}>{headline}</Text>
          </View>
          <Pressable onPress={load} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <RefreshCw color={colors.text} size={18} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.muted}>Loading...</Text> : null}

        <View style={styles.codeCard}>
          <View style={styles.codeTop}>
            <View style={styles.codeIcon}>
              <Ticket color={colors.accent} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.codeLabel}>Your code</Text>
              <Text style={styles.codeValue}>{code}</Text>
            </View>
          </View>
          <Text style={styles.codeHint} numberOfLines={2}>
            Share this code with friends. When they join and qualify, rewards are added to your coin and perk balances.
          </Text>
          {link ? (
            <View style={styles.linkBox}>
              <Text style={styles.linkLabel}>Link</Text>
              <Text style={styles.linkValue} numberOfLines={2}>
                {link}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{Number(data?.summary?.coinBalance ?? 0)}</Text>
            <Text style={styles.metricLabel}>Coins</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{Number(data?.summary?.perkCreditBalance ?? 0)}</Text>
            <Text style={styles.metricLabel}>Perk credits</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{Number(data?.summary?.pendingInvites ?? 0)}</Text>
            <Text style={styles.metricLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent Invites</Text>
          {(data?.invites ?? []).slice(0, 6).map((i) => (
            <View key={i.id} style={styles.row}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {i.referredUser?.name || "New user"}
              </Text>
              <Text style={[styles.badge, { color: i.status === "REWARDED" ? colors.success : colors.warning }]}>
                {i.status.replaceAll("_", " ")}
              </Text>
            </View>
          ))}
          {!loading && !error && (data?.invites?.length ?? 0) === 0 ? (
            <Text style={styles.muted}>No invites yet.</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent Rewards</Text>
          {(data?.transactions ?? []).slice(0, 6).map((t) => (
            <View key={t.id} style={styles.row}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {t.note || t.source}
              </Text>
              <Text style={[styles.badge, { color: t.type === "CREDIT" ? colors.success : colors.danger }]}>
                {t.type === "CREDIT" ? "+" : "-"}
                {Math.abs(Number(t.amount || 0))}
              </Text>
            </View>
          ))}
          {!loading && !error && (data?.transactions?.length ?? 0) === 0 ? (
            <Text style={styles.muted}>No reward transactions yet.</Text>
          ) : null}
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
  backBtn: { height: 36, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  backText: { color: colors.textMuted, fontWeight: "900", fontSize: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900" },
  sub: { color: colors.textMuted, fontWeight: "700", marginTop: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },

  codeCard: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  codeTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  codeIcon: { width: 36, height: 36, borderRadius: 14, borderWidth: 1, borderColor: "rgba(124,58,237,0.35)", backgroundColor: "rgba(124,58,237,0.18)", alignItems: "center", justifyContent: "center" },
  codeLabel: { color: colors.textMuted, fontWeight: "800", fontSize: 11 },
  codeValue: { color: colors.text, fontWeight: "900", fontSize: 24, marginTop: 4 },
  codeHint: { color: colors.textMuted, fontWeight: "700", fontSize: 12, lineHeight: 18 },
  linkBox: { borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", padding: 12, gap: 6 },
  linkLabel: { color: colors.textMuted, fontWeight: "900", fontSize: 11 },
  linkValue: { color: colors.text, fontWeight: "700", fontSize: 12, lineHeight: 18 },

  metricsRow: { flexDirection: "row", gap: 10 },
  metric: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 12, gap: 6 },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: "900" },
  metricLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },

  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  sectionTitle: { color: colors.text, fontWeight: "900" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderTopWidth: 1, borderTopColor: "#22304A", paddingTop: 10 },
  rowTitle: { flex: 1, color: colors.text, fontWeight: "800", fontSize: 12 },
  badge: { fontWeight: "900", fontSize: 12 },
});
