import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { StatusTimeline } from "@/components/StatusTimeline";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type SubmissionRow = {
  id: string;
  createdAt: string;
  managerReviewedAt?: string | null;
  adminReviewedAt?: string | null;
  managerStatus: string;
  adminStatus: string;
  stage: "APPROVED" | "ADMIN_REJECTED" | "MANAGER_REJECTED" | "PENDING_ADMIN" | "PENDING_MANAGER";
  campaign: { title: string; category: string; rewardPerTask: number } | null;
  proofLink?: string | null;
  proofText?: string | null;
  proofImage?: string | null;
};

type SubmissionList = { submissions: SubmissionRow[] };

function makeTimeline(input: { stage: SubmissionRow["stage"]; createdAt: string; managerReviewedAt?: string | null; adminReviewedAt?: string | null }) {
  const stage = input.stage;
  const submittedMeta = new Date(input.createdAt).toLocaleString();
  const managerMeta =
    stage === "PENDING_MANAGER"
      ? "Waiting for manager review."
      : input.managerReviewedAt
        ? new Date(input.managerReviewedAt).toLocaleString()
        : "Manager stage completed.";
  const adminMeta =
    stage === "PENDING_ADMIN"
      ? "Waiting for admin verification."
      : input.adminReviewedAt
        ? new Date(input.adminReviewedAt).toLocaleString()
        : stage === "PENDING_MANAGER"
          ? "Not reached yet."
          : "Admin stage completed.";

  const managerStatus = stage === "PENDING_MANAGER" ? "ACTIVE" : "DONE";
  const adminStatus =
    stage === "PENDING_ADMIN" ? "ACTIVE" : stage === "APPROVED" || stage === "ADMIN_REJECTED" ? "DONE" : "PENDING";
  const doneStatus = stage === "APPROVED" || stage === "ADMIN_REJECTED" || stage === "MANAGER_REJECTED" ? "ACTIVE" : "PENDING";

  return [
    { key: "submitted", label: "Submitted", status: "DONE" as const, meta: submittedMeta, tone: "success" as const },
    { key: "manager", label: "Manager Review", status: managerStatus as "DONE" | "ACTIVE" | "PENDING", meta: managerMeta, tone: "warning" as const },
    { key: "admin", label: "Admin Review", status: adminStatus as "DONE" | "ACTIVE" | "PENDING", meta: adminMeta, tone: "info" as const },
    {
      key: "final",
      label: "Final Outcome",
      status: doneStatus as "DONE" | "ACTIVE" | "PENDING",
      meta: stage.replaceAll("_", " "),
      tone: stage === "APPROVED" ? ("success" as const) : stage.includes("REJECTED") ? ("danger" as const) : ("muted" as const),
    },
  ];
}

export default function SubmissionDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [row, setRow] = useState<SubmissionRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<SubmissionList>("/api/v2/users/me/submissions");
      const found = (resp.data.submissions || []).find((s) => s.id === id) || null;
      setRow(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load submission");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    load();
  }, [id, load]);

  const stages = useMemo(() => {
    if (!row) return [];
    return makeTimeline({
      stage: row.stage,
      createdAt: row.createdAt,
      managerReviewedAt: row.managerReviewedAt ?? null,
      adminReviewedAt: row.adminReviewedAt ?? null,
    });
  }, [row]);

  return (
    <ScreenShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {row?.campaign?.title || "Submission"}
          </Text>
          <View style={{ width: 52 }} />
        </View>

        {loading ? <Text style={styles.muted}>Loading...</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !error && !row ? <Text style={styles.muted}>Submission not found.</Text> : null}

        {row ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Timeline</Text>
              <StatusTimeline stages={stages} />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Proof</Text>
              {row.proofLink ? <Text style={styles.proof}>Link: {row.proofLink}</Text> : null}
              {row.proofText ? <Text style={styles.proof}>Note: {row.proofText}</Text> : null}
              {row.proofImage ? <Text style={styles.proof}>Image: {row.proofImage}</Text> : null}
              {!row.proofLink && !row.proofText && !row.proofImage ? <Text style={styles.muted}>No proof fields found.</Text> : null}
            </View>
          </>
        ) : null}
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
  title: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "900" },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  sectionTitle: { color: colors.text, fontWeight: "900" },
  proof: { color: colors.textMuted, fontWeight: "700", fontSize: 12, lineHeight: 18 },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
});
