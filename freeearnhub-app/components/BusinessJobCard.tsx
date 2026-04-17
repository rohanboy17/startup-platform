import { Pressable, StyleSheet, Text, View } from "react-native";
import { BadgeCheck, BriefcaseBusiness, MapPin, Users } from "lucide-react-native";

import { colors } from "@/lib/theme";

export type BusinessJobCardData = {
  id: string;
  title: string;
  status: string;
  city: string;
  state: string;
  employmentType: string;
  workMode: string;
  payAmount: number;
  payUnit: string;
  metrics?: {
    totalApplications: number;
    applied: number;
    shortlisted: number;
    hired: number;
  };
};

function formatStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

function statusTone(status: string) {
  const s = status.toUpperCase();
  if (s === "OPEN") return { bg: "rgba(62,233,154,0.14)", border: "rgba(62,233,154,0.32)", text: colors.success };
  if (s === "PENDING_REVIEW") return { bg: "rgba(69,225,255,0.12)", border: "rgba(69,225,255,0.28)", text: colors.accent };
  if (s === "FILLED") return { bg: "rgba(153,162,194,0.10)", border: "rgba(153,162,194,0.20)", text: colors.textMuted };
  return { bg: "rgba(153,162,194,0.10)", border: "rgba(153,162,194,0.20)", text: colors.textMuted };
}

export function BusinessJobCard({ job, onPress }: { job: BusinessJobCardData; onPress?: () => void }) {
  const tone = statusTone(job.status);

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed, !onPress && styles.disabled]}>
      <View style={styles.top}>
        <View style={styles.iconWrap}>
          <BriefcaseBusiness color={colors.accent} size={18} />
        </View>
        <View style={styles.main}>
          <Text style={styles.title} numberOfLines={1}>
            {job.title}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
            <BadgeCheck color={tone.text} size={12} />
            <Text style={[styles.statusText, { color: tone.text }]} numberOfLines={1}>
              {formatStatus(job.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.pay}>
          Rs {Number(job.payAmount || 0).toFixed(0)}
          <Text style={styles.payUnit}>/{job.payUnit.toLowerCase()}</Text>
        </Text>
      </View>

      <View style={styles.bottom}>
        <View style={styles.pill}>
          <MapPin color={colors.textMuted} size={13} />
          <Text style={styles.pillText} numberOfLines={1}>
            {job.city}, {job.state}
          </Text>
        </View>
        <View style={styles.pill}>
          <Users color={colors.textMuted} size={13} />
          <Text style={styles.pillText}>
            {job.metrics?.totalApplications ?? 0} applicants
          </Text>
        </View>
      </View>

      {job.metrics ? (
        <View style={styles.metricsRow}>
          <Text style={styles.metricText}>Applied: {job.metrics.applied}</Text>
          <Text style={styles.metricText}>Shortlisted: {job.metrics.shortlisted}</Text>
          <Text style={styles.metricText}>Hired: {job.metrics.hired}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.94 },
  disabled: { opacity: 0.96 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  top: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: "rgba(69,225,255,0.25)", backgroundColor: "rgba(69,225,255,0.10)", alignItems: "center", justifyContent: "center" },
  main: { flex: 1, gap: 8 },
  title: { color: colors.text, fontSize: 15, fontWeight: "900" },
  statusPill: { alignSelf: "flex-start", height: 28, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { fontSize: 11, fontWeight: "900" },
  pay: { color: "#72FFB7", fontSize: 18, fontWeight: "900" },
  payUnit: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  bottom: { flexDirection: "row", alignItems: "center", gap: 10 },
  pill: { flex: 1, height: 28, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", flexDirection: "row", alignItems: "center", gap: 6 },
  pillText: { color: colors.textMuted, fontSize: 11, fontWeight: "800", flexShrink: 1 },
  metricsRow: { flexDirection: "row", gap: 10, justifyContent: "space-between" },
  metricText: { color: colors.textMuted, fontWeight: "800", fontSize: 11 },
});

