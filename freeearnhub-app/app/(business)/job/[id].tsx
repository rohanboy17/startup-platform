import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BriefcaseBusiness, CheckCircle2, RefreshCw, UserRound, XCircle } from "lucide-react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type ApplicantRow = {
  id: string;
  status: string;
  adminStatus: string;
  createdAt: string;
  coverNote: string | null;
  businessNote: string | null;
  user: {
    id: string;
    name: string | null;
    profile: { city: string | null; state: string | null; languages: string[] };
    skills: string[];
    experience: any;
  };
};

type JobDetailsResp = {
  accessRole: string;
  job: {
    id: string;
    title: string;
    city: string;
    state: string;
    status: string;
    payAmount: number;
    payUnit: string;
    applications: ApplicantRow[];
  };
};

function tone(status: string) {
  if (status === "HIRED" || status === "JOINED") return colors.success;
  if (status === "REJECTED") return colors.danger;
  if (status === "SHORTLISTED" || status === "INTERVIEW_SCHEDULED") return colors.warning;
  return colors.textMuted;
}

export default function BusinessJobDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const jobId = params.id || "";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<JobDetailsResp | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<JobDetailsResp>(`/api/v2/business/jobs/${jobId}`);
      setData(resp.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load job");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    load();
  }, [jobId, load]);

  const canReview = useMemo(() => {
    const role = (data?.accessRole || "").toUpperCase();
    return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
  }, [data?.accessRole]);

  const updateApplicant = async (applicationId: string, status: "HIRED" | "REJECTED") => {
    if (!jobId) return;
    setBusyId(applicationId);
    setToast("");
    try {
      const resp = await api.patch(`/api/v2/business/jobs/${jobId}/applications/${applicationId}`, { status });
      setToast((resp.data as { message?: string })?.message || "Updated");
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const applicants = data?.job?.applications ?? [];

  return (
    <ScreenShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {data?.job?.title || "Job"}
          </Text>
          <Pressable onPress={load} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <RefreshCw color={colors.text} size={18} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {toast ? <Text style={styles.muted}>{toast}</Text> : null}
        {loading ? <Text style={styles.muted}>Loading...</Text> : null}

        {data?.job ? (
          <View style={styles.headCard}>
            <View style={styles.headTop}>
              <BriefcaseBusiness color={colors.accent} size={18} />
              <Text style={styles.headStatus}>{data.job.status.replaceAll("_", " ")}</Text>
            </View>
            <Text style={styles.headMeta}>
              {data.job.city}, {data.job.state} • Rs {Number(data.job.payAmount || 0).toFixed(0)}/{data.job.payUnit.toLowerCase()}
            </Text>
            <Text style={styles.headMeta}>Applicants: {applicants.length}</Text>
            {!canReview ? <Text style={styles.hint}>Your team role can view applicants but cannot hire/reject.</Text> : null}
          </View>
        ) : null}

        {!loading && !error && applicants.length === 0 ? <Text style={styles.muted}>No applicants yet.</Text> : null}

        <View style={styles.list}>
          {applicants.map((a) => {
            const canAct = canReview && a.adminStatus === "ADMIN_APPROVED" && !["HIRED", "REJECTED"].includes(a.status);
            const initials = (a.user?.name || "User").trim().slice(0, 2).toUpperCase();
            return (
              <View key={a.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {a.user?.name || "Candidate"}
                    </Text>
                    <Text style={styles.cardMsg} numberOfLines={1}>
                      {a.user?.profile?.city || "-"}, {a.user?.profile?.state || "-"}
                    </Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      Admin: {a.adminStatus.replaceAll("_", " ")} • Status:{" "}
                      <Text style={{ color: tone(a.status), fontWeight: "900" }}>{a.status.replaceAll("_", " ")}</Text>
                    </Text>
                  </View>
                </View>

                {a.coverNote ? (
                  <Text style={styles.note} numberOfLines={3}>
                    {a.coverNote}
                  </Text>
                ) : null}

                <View style={styles.skillsRow}>
                  {(a.user?.skills ?? []).slice(0, 4).map((s) => (
                    <View key={s} style={styles.pill}>
                      <UserRound color={colors.textMuted} size={12} />
                      <Text style={styles.pillText} numberOfLines={1}>
                        {s}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.actions}>
                  <Text style={styles.date}>{new Date(a.createdAt).toLocaleDateString()}</Text>
                  <Pressable
                    disabled={!canAct || busyId === a.id}
                    onPress={() => updateApplicant(a.id, "HIRED")}
                    style={({ pressed }) => [styles.btn, pressed && styles.pressed, (!canAct || busyId === a.id) && styles.disabled]}
                  >
                    <CheckCircle2 color="#09101F" size={16} />
                    <Text style={styles.btnText}>Hire</Text>
                  </Pressable>
                  <Pressable
                    disabled={!canAct || busyId === a.id}
                    onPress={() => updateApplicant(a.id, "REJECTED")}
                    style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed, (!canAct || busyId === a.id) && styles.disabled]}
                  >
                    <XCircle color={colors.text} size={16} />
                    <Text style={styles.btnTextSecondary}>Reject</Text>
                  </Pressable>
                </View>

                {a.adminStatus !== "ADMIN_APPROVED" ? (
                  <Text style={styles.hint}>Chat and hiring actions unlock only after admin approves this candidate.</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { height: 36, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  backText: { color: colors.textMuted, fontWeight: "900", fontSize: 12 },
  title: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "900" },
  iconBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  headCard: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 8 },
  headTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headStatus: { color: colors.accentAlt, fontWeight: "900", fontSize: 11 },
  headMeta: { color: colors.textMuted, fontWeight: "700" },
  hint: { color: colors.textMuted, fontWeight: "700", lineHeight: 18, fontSize: 12 },
  list: { gap: 12 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  avatar: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "rgba(124,58,237,0.35)", backgroundColor: "rgba(124,58,237,0.18)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.text, fontWeight: "900" },
  cardTitle: { color: colors.text, fontWeight: "900" },
  cardMsg: { color: colors.textMuted, fontWeight: "700", marginTop: 6, fontSize: 12 },
  cardMeta: { color: colors.textMuted, fontWeight: "700", marginTop: 6, fontSize: 11 },
  note: { color: colors.textMuted, fontWeight: "700", fontSize: 12, lineHeight: 18 },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { height: 28, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", flexDirection: "row", alignItems: "center", gap: 6 },
  pillText: { color: colors.textMuted, fontWeight: "800", fontSize: 11, maxWidth: 160 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "flex-end" },
  date: { color: colors.textMuted, fontWeight: "800", fontSize: 11, marginRight: "auto" },
  btn: { height: 38, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  btnText: { color: "#09101F", fontWeight: "900" },
  btnSecondary: { height: 38, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  btnTextSecondary: { color: colors.text, fontWeight: "900" },
  disabled: { opacity: 0.5 },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
});

