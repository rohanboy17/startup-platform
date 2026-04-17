import { Pressable, StyleSheet, Text, View } from "react-native";
import { BriefcaseBusiness, MapPin } from "lucide-react-native";

import { colors } from "@/lib/theme";

export type JobCardData = {
  id: string;
  title: string;
  businessName: string;
  city: string;
  state: string;
  workMode: string;
  employmentType: string;
  workerPayAmount: number;
  payUnit: string;
  applicationStatus?: string | null;
};

export function JobCard({ job, onPress }: { job: JobCardData; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <View style={styles.iconWrap}>
          <BriefcaseBusiness color={colors.accent} size={18} />
        </View>
        <View style={styles.main}>
          <Text style={styles.title} numberOfLines={1}>
            {job.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {job.businessName} - {job.workMode.replaceAll("_", " ")}
          </Text>
        </View>
        <Text style={styles.pay}>
          Rs {Number(job.workerPayAmount || 0).toFixed(0)}
          <Text style={styles.payUnit}>/{job.payUnit.toLowerCase()}</Text>
        </Text>
      </View>
      <View style={styles.bottom}>
        <View style={styles.pill}>
          <MapPin color={colors.textMuted} size={13} />
          <Text style={styles.pillText}>
            {job.city}, {job.state}
          </Text>
        </View>
        {job.applicationStatus ? (
          <Text style={[styles.status, job.applicationStatus === "APPLIED" ? styles.statusActive : styles.statusMuted]}>
            {job.applicationStatus.replaceAll("_", " ")}
          </Text>
        ) : (
          <Text style={styles.statusMuted}>{job.employmentType.replaceAll("_", " ")}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.94 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  top: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: "rgba(69,225,255,0.25)", backgroundColor: "rgba(69,225,255,0.10)", alignItems: "center", justifyContent: "center" },
  main: { flex: 1 },
  title: { color: colors.text, fontSize: 15, fontWeight: "900" },
  meta: { color: colors.textMuted, marginTop: 6, fontSize: 12, fontWeight: "700" },
  pay: { color: "#72FFB7", fontSize: 18, fontWeight: "900" },
  payUnit: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  bottom: { flexDirection: "row", alignItems: "center", gap: 10 },
  pill: { height: 28, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", flexDirection: "row", alignItems: "center", gap: 6 },
  pillText: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  status: { marginLeft: "auto", fontSize: 11, fontWeight: "900" },
  statusActive: { color: colors.accent },
  statusMuted: { marginLeft: "auto", color: colors.textMuted, fontSize: 11, fontWeight: "800" },
});
