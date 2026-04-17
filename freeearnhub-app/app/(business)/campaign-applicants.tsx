import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ClipboardCheck, RefreshCw, ShieldCheck } from "lucide-react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type SubmissionRow = {
  id: string;
  stage: "APPROVED" | "ADMIN_REJECTED" | "MANAGER_REJECTED" | "PENDING_ADMIN" | "PENDING_MANAGER";
  managerStatus: string;
  adminStatus: string;
  rewardAmount: number;
  createdAt: string;
  canViewProof: boolean;
  reason: string | null;
  campaign: { id: string; title: string; category: string; rewardPerTask: number };
  user: { name: string | null };
  proofLink: string | null;
  proofText: string | null;
  proofImage: string | null;
};

type ApplicantsResp = {
  counts: { total: number; pendingManager: number; pendingAdmin: number; approved: number; rejected: number };
  submissions: SubmissionRow[];
};

function stageTone(stage: SubmissionRow["stage"]) {
  if (stage === "APPROVED") return colors.success;
  if (stage === "ADMIN_REJECTED" || stage === "MANAGER_REJECTED") return colors.danger;
  if (stage === "PENDING_ADMIN") return colors.accentAlt;
  return colors.warning;
}

export default function BusinessCampaignApplicantsScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApplicantsResp | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<ApplicantsResp>("/api/v2/business/submissions");
      setData(resp.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load applicants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => data?.submissions ?? [], [data?.submissions]);

  return (
    <ScreenShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.left}>
            <ClipboardCheck color={colors.accent} size={18} />
            <View>
              <Text style={styles.title}>Campaign Applicants</Text>
              <Text style={styles.sub}>
                {data?.counts ? `${data.counts.pendingManager + data.counts.pendingAdmin} pending review` : "Moderated submissions"}
              </Text>
            </View>
          </View>
          <Pressable onPress={load} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <RefreshCw color={colors.text} size={18} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.muted}>Loading...</Text> : null}

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{data?.counts?.pendingManager ?? 0}</Text>
            <Text style={styles.metricLabel}>Manager</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{data?.counts?.pendingAdmin ?? 0}</Text>
            <Text style={styles.metricLabel}>Admin</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{data?.counts?.approved ?? 0}</Text>
            <Text style={styles.metricLabel}>Approved</Text>
          </View>
        </View>

        {!loading && !error && rows.length === 0 ? <Text style={styles.muted}>No submissions yet.</Text> : null}

        <View style={styles.list}>
          {rows.map((s) => (
            <View key={s.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconWrap}>
                  <ShieldCheck color={colors.accent} size={16} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {s.campaign?.title || "Campaign"}
                  </Text>
                  <Text style={styles.cardMsg} numberOfLines={1}>
                    {s.user?.name || "User"} • Rs {Number(s.rewardAmount || s.campaign?.rewardPerTask || 0).toFixed(0)}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {new Date(s.createdAt).toLocaleString()}
                  </Text>
                </View>
                <Text style={[styles.badge, { color: stageTone(s.stage) }]}>{s.stage.replaceAll("_", " ")}</Text>
              </View>

              {!s.canViewProof ? (
                <Text style={styles.locked}>Proof hidden until manager review starts.</Text>
              ) : (
                <>
                  {s.proofLink ? <Text style={styles.proof} numberOfLines={1}>Link: {s.proofLink}</Text> : null}
                  {s.proofText ? <Text style={styles.proof} numberOfLines={2}>Note: {s.proofText}</Text> : null}
                  {s.reason ? <Text style={styles.reason} numberOfLines={2}>Reason: {s.reason}</Text> : null}
                </>
              )}
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
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900" },
  sub: { color: colors.textMuted, fontWeight: "700", marginTop: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  metricsRow: { flexDirection: "row", gap: 10 },
  metric: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 12, gap: 6 },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: "900" },
  metricLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  list: { gap: 12 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  iconWrap: { width: 34, height: 34, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.text, fontWeight: "900" },
  cardMsg: { color: colors.textMuted, fontWeight: "700", marginTop: 6, fontSize: 12 },
  cardMeta: { color: colors.textMuted, fontWeight: "700", marginTop: 6, fontSize: 11 },
  badge: { fontWeight: "900", fontSize: 11, marginTop: 2 },
  locked: { color: colors.textMuted, fontWeight: "800", lineHeight: 18 },
  proof: { color: colors.textMuted, fontWeight: "700", fontSize: 12, lineHeight: 18 },
  reason: { color: colors.danger, fontWeight: "800", fontSize: 12, lineHeight: 18 },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
});

