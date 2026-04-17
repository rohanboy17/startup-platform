import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ClipboardCheck, RefreshCw } from "lucide-react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type SubmissionRow = {
  id: string;
  createdAt: string;
  status: string;
  managerStatus: string;
  adminStatus: string;
  stage: "APPROVED" | "ADMIN_REJECTED" | "MANAGER_REJECTED" | "PENDING_ADMIN" | "PENDING_MANAGER";
  campaign: { title: string; category: string; rewardPerTask: number } | null;
};

type SubmissionList = { submissions: SubmissionRow[] };

function stageLabel(stage: SubmissionRow["stage"]) {
  if (stage === "APPROVED") return "Approved";
  if (stage === "ADMIN_REJECTED") return "Rejected (Admin)";
  if (stage === "MANAGER_REJECTED") return "Rejected (Manager)";
  if (stage === "PENDING_ADMIN") return "Admin Review";
  return "Manager Review";
}

function stageColor(stage: SubmissionRow["stage"]) {
  if (stage === "APPROVED") return colors.success;
  if (stage === "ADMIN_REJECTED" || stage === "MANAGER_REJECTED") return colors.danger;
  return colors.accent;
}

export default function UserSubmissionsScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<SubmissionList>("/api/v2/users/me/submissions");
      setRows(resp.data.submissions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => rows, [rows]);

  return (
    <ScreenShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.titleRow}>
            <View style={styles.iconWrap}>
              <ClipboardCheck color={colors.accent} size={18} />
            </View>
            <Text style={styles.title}>Reviews</Text>
          </View>
          <Pressable onPress={load} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <RefreshCw color={colors.text} size={18} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.muted}>Loading...</Text> : null}
        {!loading && sorted.length === 0 ? <Text style={styles.muted}>No submissions yet.</Text> : null}

        <View style={styles.list}>
          {sorted.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push({ pathname: "/(user)/submission/[id]", params: { id: s.id } })}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {s.campaign?.title || "Campaign"}
                </Text>
                <Text style={[styles.badge, { color: stageColor(s.stage) }]}>{stageLabel(s.stage)}</Text>
              </View>
              <Text style={styles.cardMeta} numberOfLines={1}>
                {new Date(s.createdAt).toLocaleString()}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 28 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: "rgba(69,225,255,0.25)", backgroundColor: "rgba(69,225,255,0.10)", alignItems: "center", justifyContent: "center" },
  title: { color: colors.text, fontSize: 22, fontWeight: "900" },
  iconBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  error: { color: colors.danger, fontWeight: "800", marginBottom: 10 },
  muted: { color: colors.textMuted, fontWeight: "700", marginBottom: 10 },
  list: { gap: 12 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cardTitle: { flex: 1, color: colors.text, fontWeight: "900" },
  badge: { fontWeight: "900", fontSize: 12 },
  cardMeta: { color: colors.textMuted, fontWeight: "700", fontSize: 12 },
});
