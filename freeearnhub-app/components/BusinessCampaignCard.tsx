import { Pressable, StyleSheet, Text, View } from "react-native";
import { BadgeCheck, Clock, Coins, Layers3 } from "lucide-react-native";

import { colors } from "@/lib/theme";

export type BusinessCampaignCardData = {
  id: string;
  title: string;
  status: string;
  rewardPerTask: number;
  totalBudget: number;
  remainingBudget: number;
  metrics?: {
    approvedCount: number;
    rejectedCount: number;
    pendingCount: number;
    totalSlots: number;
    usedSlots: number;
    slotsLeft: number;
  };
};

function formatStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

function statusTone(status: string) {
  const s = status.toUpperCase();
  if (s === "LIVE") return { bg: "rgba(62,233,154,0.14)", border: "rgba(62,233,154,0.32)", text: colors.success };
  if (s === "PENDING") return { bg: "rgba(69,225,255,0.12)", border: "rgba(69,225,255,0.28)", text: colors.accent };
  if (s === "APPROVED") return { bg: "rgba(69,225,255,0.10)", border: "rgba(69,225,255,0.22)", text: colors.accent };
  if (s === "COMPLETED") return { bg: "rgba(153,162,194,0.10)", border: "rgba(153,162,194,0.20)", text: colors.textMuted };
  return { bg: "rgba(153,162,194,0.10)", border: "rgba(153,162,194,0.20)", text: colors.textMuted };
}

export function BusinessCampaignCard({ campaign, onPress }: { campaign: BusinessCampaignCardData; onPress?: () => void }) {
  const tone = statusTone(campaign.status);
  const metrics = campaign.metrics;

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed, !onPress && styles.disabled]}>
      <View style={styles.top}>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {campaign.title}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
            <Clock color={tone.text} size={12} />
            <Text style={[styles.statusText, { color: tone.text }]} numberOfLines={1}>
              {formatStatus(campaign.status)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.pill}>
          <Coins color={colors.textMuted} size={13} />
          <Text style={styles.pillText}>Budget: Rs {Number(campaign.totalBudget || 0).toFixed(0)}</Text>
        </View>
        <View style={styles.pill}>
          <Layers3 color={colors.textMuted} size={13} />
          <Text style={styles.pillText}>Left: Rs {Number(campaign.remainingBudget || 0).toFixed(0)}</Text>
        </View>
      </View>

      {metrics ? (
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <BadgeCheck color={colors.success} size={14} />
            <Text style={styles.metricValue}>{metrics.approvedCount}</Text>
            <Text style={styles.metricLabel}>Approved</Text>
          </View>
          <View style={styles.metric}>
            <BadgeCheck color={colors.accent} size={14} />
            <Text style={styles.metricValue}>{metrics.pendingCount}</Text>
            <Text style={styles.metricLabel}>Pending</Text>
          </View>
          <View style={styles.metric}>
            <BadgeCheck color={colors.textMuted} size={14} />
            <Text style={styles.metricValue}>{metrics.slotsLeft}</Text>
            <Text style={styles.metricLabel}>Slots</Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.94 },
  disabled: { opacity: 0.96 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 12 },
  top: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  titleWrap: { flex: 1, gap: 10 },
  title: { color: colors.text, fontSize: 15, fontWeight: "900" },
  statusPill: { alignSelf: "flex-start", height: 28, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { fontSize: 11, fontWeight: "900" },
  row: { flexDirection: "row", gap: 10 },
  pill: { flex: 1, height: 30, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", flexDirection: "row", alignItems: "center", gap: 6 },
  pillText: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  metricsRow: { flexDirection: "row", gap: 10 },
  metric: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", paddingVertical: 10, alignItems: "center", justifyContent: "center", gap: 6 },
  metricValue: { color: colors.text, fontSize: 16, fontWeight: "900" },
  metricLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
});

