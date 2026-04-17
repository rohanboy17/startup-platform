import { Stack, router, useLocalSearchParams } from "expo-router";
import { BriefcaseBusiness, MapPin, Send } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type JobRow = {
  id: string;
  title: string;
  description: string;
  businessName: string;
  jobCategory: string;
  jobType: string;
  workMode: string;
  employmentType: string;
  city: string;
  state: string;
  addressLine: string | null;
  openings: number;
  workerPayAmount: number;
  payUnit: string;
  applicationStatus: string | null;
  matchScore: number;
  matchReasons: string[];
};

type JobsResp = { jobs: JobRow[] };

export default function JobDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [row, setRow] = useState<JobRow | null>(null);
  const [coverNote, setCoverNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<JobsResp>("/api/v2/jobs");
      const found = (resp.data.jobs || []).find((j) => j.id === id) || null;
      setRow(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load job");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    load();
  }, [id, load]);

  const canApply = useMemo(() => {
    if (!row) return false;
    return !row.applicationStatus;
  }, [row]);

  const onApply = async () => {
    if (!row) return;
    setBusy(true);
    setMsg("");
    try {
      const resp = await api.post(`/api/v2/jobs/${row.id}/apply`, {
        coverNote: coverNote.trim() || undefined,
      });
      setMsg((resp.data as { message?: string })?.message || "Applied");
      router.back();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {row?.title || "Job"}
          </Text>
          <View style={{ width: 52 }} />
        </View>

        {loading ? <Text style={styles.muted}>Loading...</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !error && !row ? <Text style={styles.muted}>Job not found.</Text> : null}

        {row ? (
          <>
            <View style={styles.card}>
              <View style={styles.headRow}>
                <View style={styles.iconWrap}>
                  <BriefcaseBusiness color={colors.accent} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.h1}>{row.title}</Text>
                  <Text style={styles.meta}>
                    {row.businessName} - {row.employmentType.replaceAll("_", " ")}
                  </Text>
                </View>
                <Text style={styles.pay}>
                  Rs {Number(row.workerPayAmount || 0).toFixed(0)}
                  <Text style={styles.payUnit}>/{row.payUnit.toLowerCase()}</Text>
                </Text>
              </View>

              <View style={styles.pillRow}>
                <View style={styles.pill}>
                  <MapPin color={colors.textMuted} size={13} />
                  <Text style={styles.pillText}>
                    {row.city}, {row.state}
                  </Text>
                </View>
                <Text style={styles.pillTextMuted}>{row.workMode.replaceAll("_", " ")}</Text>
              </View>

              <Text style={styles.desc}>{row.description}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Apply</Text>
              {!canApply ? <Text style={styles.muted}>You already applied to this job.</Text> : null}
              <TextInput
                value={coverNote}
                onChangeText={setCoverNote}
                placeholder="Cover note (optional)"
                placeholderTextColor={colors.textMuted}
                style={styles.textArea}
                multiline
              />
              <Pressable
                disabled={!canApply || busy}
                onPress={onApply}
                style={({ pressed }) => [
                  styles.applyBtn,
                  (!canApply || busy) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Send color="#09101F" size={16} />
                <Text style={styles.applyText}>{busy ? "Submitting..." : "Apply"}</Text>
              </Pressable>
              {msg ? <Text style={styles.muted}>{msg}</Text> : null}
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
  headRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: "rgba(69,225,255,0.25)", backgroundColor: "rgba(69,225,255,0.10)", alignItems: "center", justifyContent: "center" },
  h1: { color: colors.text, fontSize: 16, fontWeight: "900" },
  meta: { color: colors.textMuted, marginTop: 6, fontWeight: "700" },
  pay: { color: "#72FFB7", fontSize: 18, fontWeight: "900" },
  payUnit: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  pillRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  pill: { height: 28, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", flexDirection: "row", alignItems: "center", gap: 6 },
  pillText: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  pillTextMuted: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  desc: { color: colors.text, fontSize: 12, fontWeight: "600", lineHeight: 18 },
  sectionTitle: { color: colors.text, fontWeight: "900" },
  textArea: { minHeight: 90, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontWeight: "700" },
  applyBtn: { height: 46, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  applyText: { color: "#09101F", fontWeight: "900", fontSize: 14 },
  disabled: { opacity: 0.5 },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
});
