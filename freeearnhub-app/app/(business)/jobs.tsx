import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BriefcaseBusiness, RefreshCw } from "lucide-react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { BusinessJobCard, type BusinessJobCardData } from "@/components/BusinessJobCard";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type BusinessJobsResponse = {
  accessRole: string;
  jobs: BusinessJobCardData[];
};

export default function BusinessJobsScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BusinessJobsResponse | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<BusinessJobsResponse>("/api/v2/business/jobs");
      setData(resp.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.left}>
            <BriefcaseBusiness color={colors.accent} size={18} />
            <Text style={styles.title}>Job Management</Text>
          </View>
          <Pressable onPress={load} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <RefreshCw color={colors.text} size={18} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.muted}>Loading...</Text> : null}

        {!loading && !error && (data?.jobs?.length ?? 0) === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No jobs posted yet</Text>
            <Text style={styles.emptyText}>Create jobs from web for now. Mobile shows verified hiring progress.</Text>
          </View>
        ) : null}

        <View style={styles.list}>
          {(data?.jobs ?? []).map((job) => (
            <BusinessJobCard key={job.id} job={job} />
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
  iconBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  list: { gap: 12 },
  empty: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 16, gap: 10 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  emptyText: { color: colors.textMuted, fontWeight: "700", lineHeight: 18 },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
});
