import { router } from "expo-router";
import { Search } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { JobCard, JobCardData } from "@/components/JobCard";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type JobsResp = {
  jobs: (JobCardData & {
    description: string;
    jobCategory: string;
    jobType: string;
    customJobType: string | null;
    addressLine: string | null;
    openings: number;
    matchScore: number;
    matchReasons: string[];
    distanceKm: number | null;
  })[];
  summary: { totalOpen: number; strongMatches: number; appliedCount: number; nearbyCount: number };
  filters: { city: string | null; radiusKm: number | null };
};

export default function UserJobsScreen() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<JobsResp["jobs"]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<JobsResp>("/api/v2/jobs");
      setRows(resp.data.jobs || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((j) => (!q ? true : `${j.title} ${j.businessName} ${j.city} ${j.state}`.toLowerCase().includes(q)));
  }, [query, rows]);

  return (
    <ScreenShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Text style={styles.title}>Jobs</Text>
          <Pressable onPress={load} style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}>
            <Text style={styles.refreshText}>{loading ? "..." : "Refresh"}</Text>
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Search color={colors.textMuted} size={18} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search jobs"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.muted}>Loading...</Text> : null}
        {!loading && filtered.length === 0 ? <Text style={styles.muted}>No jobs found.</Text> : null}

        <View style={styles.list}>
          {filtered.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onPress={() => router.push({ pathname: "/(user)/job/[id]", params: { id: job.id } })}
            />
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
  title: { color: colors.text, fontSize: 22, fontWeight: "900" },
  refresh: { height: 34, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  refreshText: { color: colors.textMuted, fontWeight: "900", fontSize: 12 },
  searchWrap: { height: 48, borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  searchInput: { flex: 1, height: "100%", color: colors.text, fontSize: 15, fontWeight: "600" },
  error: { color: colors.danger, fontWeight: "800", marginBottom: 10 },
  muted: { color: colors.textMuted, fontWeight: "700", marginBottom: 10 },
  list: { gap: 12 },
});

