import { Stack, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { RefreshCw } from "lucide-react-native";

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

type MiniState = "DONE" | "ACTIVE" | "PENDING";

function timelineState(stage: SubmissionRow["stage"]): {
  submitted: MiniState;
  manager: MiniState;
  admin: MiniState;
  final: MiniState;
} {
  const manager: MiniState = stage === "PENDING_MANAGER" ? "ACTIVE" : "DONE";
  const admin: MiniState =
    stage === "PENDING_ADMIN"
      ? "ACTIVE"
      : stage === "APPROVED" || stage === "ADMIN_REJECTED"
        ? "DONE"
        : stage === "PENDING_MANAGER"
          ? "PENDING"
          : "DONE";
  const final: MiniState =
    stage === "APPROVED" || stage === "ADMIN_REJECTED" || stage === "MANAGER_REJECTED" ? "ACTIVE" : "PENDING";
  return { submitted: "DONE", manager, admin, final };
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
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Reviews</Text>
            <Text style={styles.sub}>Submission pipeline</Text>
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
              <View style={styles.miniTimeline}>
                {(() => {
                  const t = timelineState(s.stage);
                  const dotColor = (state: MiniState) =>
                    state === "DONE"
                      ? colors.success
                      : state === "ACTIVE"
                        ? colors.accentAlt
                        : "#22304A";
                  const lineColor = (state: MiniState) =>
                    state === "PENDING" ? "#22304A" : "rgba(124,58,237,0.40)";

                  return (
                    <>
                      <View style={[styles.dot, { backgroundColor: dotColor(t.submitted) }]} />
                      <View style={[styles.line, { backgroundColor: lineColor(t.manager) }]} />
                      <View style={[styles.dot, { backgroundColor: dotColor(t.manager) }]} />
                      <View style={[styles.line, { backgroundColor: lineColor(t.admin) }]} />
                      <View style={[styles.dot, { backgroundColor: dotColor(t.admin) }]} />
                      <View style={[styles.line, { backgroundColor: lineColor(t.final) }]} />
                      <View style={[styles.dot, { backgroundColor: dotColor(t.final) }]} />
                    </>
                  );
                })()}
              </View>
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
  backBtn: { height: 36, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  backText: { color: colors.textMuted, fontWeight: "900", fontSize: 12 },
  title: { color: colors.text, fontSize: 22, fontWeight: "900" },
  sub: { color: colors.textMuted, fontWeight: "700", marginTop: 4, fontSize: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  error: { color: colors.danger, fontWeight: "800", marginBottom: 10 },
  muted: { color: colors.textMuted, fontWeight: "700", marginBottom: 10 },
  list: { gap: 12 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cardTitle: { flex: 1, color: colors.text, fontWeight: "900" },
  badge: { fontWeight: "900", fontSize: 12 },
  cardMeta: { color: colors.textMuted, fontWeight: "700", fontSize: 12 },
  miniTimeline: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 999 },
  line: { height: 2, borderRadius: 999, flex: 1 },
});
