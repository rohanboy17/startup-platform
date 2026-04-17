import { Stack, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BriefcaseBusiness, RefreshCw, XCircle } from "lucide-react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type ApplicationRow = {
  id: string;
  status: string;
  managerStatus: string;
  adminStatus: string;
  managerReason: string | null;
  adminReason: string | null;
  coverNote: string | null;
  businessNote: string | null;
  interviewAt: string | null;
  joinedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  job: {
    id: string;
    title: string;
    businessName: string;
    city: string;
    state: string;
    workMode: string;
    employmentType: string;
    payAmount: number;
    payUnit: string;
    status: string;
  };
};

type JobApplicationsResp = {
  applications: ApplicationRow[];
  summary: { total: number; applied: number; shortlisted: number; interviewed: number; hired: number; joined: number; rejected: number };
};

function tone(status: string) {
  if (status === "HIRED" || status === "JOINED") return colors.success;
  if (status === "REJECTED") return colors.danger;
  if (status === "INTERVIEW_SCHEDULED") return colors.accentAlt;
  if (status === "SHORTLISTED") return colors.warning;
  return colors.textMuted;
}

export default function UserJobApplicationsScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<JobApplicationsResp | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<JobApplicationsResp>("/api/v2/users/me/job-applications");
      setData(resp.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const withdraw = async (id: string) => {
    setBusyId(id);
    setToast("");
    try {
      const resp = await api.patch(`/api/v2/users/me/job-applications/${id}`);
      setToast((resp.data as { message?: string })?.message || "Application withdrawn");
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Withdraw failed");
    } finally {
      setBusyId(null);
    }
  };

  const rows = useMemo(() => data?.applications ?? [], [data?.applications]);

  return (
    <ScreenShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>My Applications</Text>
            <Text style={styles.sub}>
              {data?.summary ? `${data.summary.total} total` : "Track job review stages"}
            </Text>
          </View>
          <Pressable onPress={load} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <RefreshCw color={colors.text} size={18} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {toast ? <Text style={styles.muted}>{toast}</Text> : null}
        {loading ? <Text style={styles.muted}>Loading...</Text> : null}
        {!loading && !error && rows.length === 0 ? <Text style={styles.muted}>No applications yet.</Text> : null}

        <View style={styles.list}>
          {rows.map((a) => {
            const canWithdraw = ["APPLIED", "SHORTLISTED", "INTERVIEW_SCHEDULED"].includes(a.status);
            return (
              <Pressable
                key={a.id}
                onPress={() => router.push({ pathname: "/(user)/job-application/[id]", params: { id: a.id } })}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.iconWrap}>
                    <BriefcaseBusiness color={colors.accent} size={16} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {a.job.title}
                    </Text>
                    <Text style={styles.cardMsg} numberOfLines={1}>
                      {a.job.businessName} - {a.job.city}, {a.job.state}
                    </Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      Status: <Text style={{ color: tone(a.status), fontWeight: "900" }}>{a.status.replaceAll("_", " ")}</Text>
                      {"  "}| Admin: {a.adminStatus.replaceAll("_", " ")}
                    </Text>
                  </View>
                  <Text style={[styles.badge, { color: tone(a.status) }]}>
                    Rs {Number(a.job.payAmount || 0).toFixed(0)}/{a.job.payUnit.toLowerCase()}
                  </Text>
                </View>

                {a.adminReason || a.managerReason ? (
                  <Text style={styles.reason} numberOfLines={2}>
                    {a.adminReason || a.managerReason}
                  </Text>
                ) : null}

                <View style={styles.actions}>
                  <Text style={styles.date}>{new Date(a.createdAt).toLocaleDateString()}</Text>
                  <Pressable
                    onPress={() => withdraw(a.id)}
                    disabled={!canWithdraw || busyId === a.id}
                    style={({ pressed }) => [
                      styles.withdrawBtn,
                      pressed && styles.pressed,
                      (!canWithdraw || busyId === a.id) && styles.disabled,
                    ]}
                  >
                    <XCircle color="#09101F" size={16} />
                    <Text style={styles.withdrawText}>{busyId === a.id ? "..." : "Withdraw"}</Text>
                  </Pressable>
                </View>
              </Pressable>
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
  topBar: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { height: 36, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  backText: { color: colors.textMuted, fontWeight: "900", fontSize: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900" },
  sub: { color: colors.textMuted, fontWeight: "700", marginTop: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  list: { gap: 12 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  iconWrap: { width: 34, height: 34, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.text, fontWeight: "900" },
  cardMsg: { color: colors.textMuted, fontWeight: "700", marginTop: 6, fontSize: 12 },
  cardMeta: { color: colors.textMuted, fontWeight: "700", marginTop: 6, fontSize: 11 },
  badge: { fontWeight: "900", fontSize: 11, marginTop: 2 },
  reason: { color: colors.textMuted, fontWeight: "700", fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  date: { color: colors.textMuted, fontWeight: "800", fontSize: 11 },
  withdrawBtn: { height: 38, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  withdrawText: { color: "#09101F", fontWeight: "900" },
  disabled: { opacity: 0.5 },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
});
