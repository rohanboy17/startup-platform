import { StyleSheet, Text, View } from "react-native";
import { CheckCircle2, Circle, Clock } from "lucide-react-native";

import { colors } from "@/lib/theme";

type Stage = {
  key: string;
  label: string;
  status: "DONE" | "ACTIVE" | "PENDING";
  meta?: string | null;
  tone?: "warning" | "info" | "success" | "danger" | "muted";
};

function toneColor(tone: Stage["tone"], fallback: string) {
  if (tone === "success") return colors.success;
  if (tone === "warning") return colors.warning;
  if (tone === "danger") return colors.danger;
  if (tone === "info") return colors.accentAlt;
  if (tone === "muted") return colors.textMuted;
  return fallback;
}

export function StatusTimeline({ stages }: { stages: Stage[] }) {
  return (
    <View style={styles.wrap}>
      {stages.map((stage, idx) => {
        const isLast = idx === stages.length - 1;
        const activeColor =
          stage.status === "DONE"
            ? toneColor(stage.tone, colors.success)
            : stage.status === "ACTIVE"
              ? toneColor(stage.tone, colors.accent)
              : colors.textMuted;
        const icon =
          stage.status === "DONE" ? (
            <CheckCircle2 color={activeColor} size={16} />
          ) : stage.status === "ACTIVE" ? (
            <Clock color={activeColor} size={16} />
          ) : (
            <Circle color={colors.textMuted} size={16} />
          );

        return (
          <View key={stage.key} style={styles.row}>
            <View style={styles.rail}>
              <View style={styles.icon}>{icon}</View>
              {!isLast ? (
                <View
                  style={[
                    styles.line,
                    stage.status !== "PENDING" && { backgroundColor: `${activeColor}55` },
                  ]}
                />
              ) : null}
            </View>
            <View style={styles.body}>
              <Text style={styles.label}>{stage.label}</Text>
              {stage.meta ? <Text style={styles.meta}>{stage.meta}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  row: { flexDirection: "row", gap: 10 },
  rail: { width: 20, alignItems: "center" },
  icon: { width: 20, height: 20, alignItems: "center", justifyContent: "center" },
  line: { width: 2, flex: 1, backgroundColor: "#22304A", marginTop: 6, borderRadius: 999 },
  body: { flex: 1, paddingTop: 1 },
  label: { color: colors.text, fontSize: 13, fontWeight: "800" },
  meta: { color: colors.textMuted, fontSize: 12, fontWeight: "600", marginTop: 4, lineHeight: 18 },
});
