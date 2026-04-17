import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { RefreshCw, Users } from "lucide-react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type JobMetrics = { totalApplications: number; applied: number; shortlisted: number; hired: number };

type JobRow = {
  id: string;
  title: string;
  city: string;
  state: string;
  status: string;
  createdAt: string;
  metrics: JobMetrics;
};

type JobsResp = { jobs: JobRow[] };

export default function BusinessJobApplicantsScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<JobRow[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<JobsResp>("/api/v2/business/jobs");
      setRows((resp.data as any)?.jobs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load job applicants");
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
          <View style={styles.left}>
            <Users color={colors.accent} size={18} />
            <View>
              <Text style={styles.title}>Job Applicants</Text>
              <Text style={styles.sub}>Tap a job to view candidates</Text>
            </View>
          </View>
          <Pressable onPress={load} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <RefreshCw color={colors.text} size={18} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.muted}>Loading...</Text> : null}
        {!loading && !error && sorted.length === 0 ? <Text style={styles.muted}>No jobs yet.</Text> : null}

        <View style={styles.list}>
          {sorted.map((job) => (
            <Pressable
              key={job.id}
              onPress={() => router.push({ pathname: "/(business)/job/[id]", params: { id: job.id } })}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {job.title}
                </Text>
                <Text style={styles.cardBadge}>{job.status.replaceAll("_", " ")}</Text>
              </View>
              <Text style={styles.cardMsg} numberOfLines={1}>
                {job.city}, {job.state}
              </Text>
              <View style={styles.metricsRow}>
                <Text style={styles.metric}>Total: {job.metrics?.totalApplications ?? 0}</Text>
                <Text style={styles.metric}>Shortlisted: {job.metrics?.shortlisted ?? 0}</Text>
                <Text style={styles.metric}>Hired: {job.metrics?.hired ?? 0}</Text>
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
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900" },
  sub: { color: colors.textMuted, fontWeight: "700", marginTop: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  list: { gap: 12 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cardTitle: { flex: 1, color: colors.text, fontWeight: "900" },
  cardBadge: { color: colors.accentAlt, fontWeight: "900", fontSize: 11 },
  cardMsg: { color: colors.textMuted, fontWeight: "700" },
  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: { color: colors.textMuted, fontWeight: "800", fontSize: 11 },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
});

