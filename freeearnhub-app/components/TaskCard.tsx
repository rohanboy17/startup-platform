import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BadgeCheck, Link as LinkIcon, Timer } from "lucide-react-native";

import { colors, gradients } from "@/lib/theme";

export type TaskCardData = {
  id: string;
  title: string;
  description: string;
  taskCategory: string;
  taskType: string;
  rewardNet: number;
  timeLabel?: string | null;
  leftSlots: number;
  slotsTotal?: number | null;
  slotsUsed?: number | null;
  difficulty?: "Easy" | "Medium" | "Hard";
  blocked?: boolean;
};

export function TaskCard({
  task,
  onPress,
}: {
  task: TaskCardData;
  onPress: () => void;
}) {
  const badgeColor = task.blocked ? colors.danger : colors.success;
  const difficulty = task.difficulty ?? (task.rewardNet <= 20 ? "Easy" : task.rewardNet <= 50 ? "Medium" : "Hard");
  const difficultyTone =
    difficulty === "Easy" ? colors.success : difficulty === "Medium" ? colors.warning : colors.danger;

  const total = Math.max(0, Number(task.slotsTotal ?? 0));
  const used = Math.max(0, Number(task.slotsUsed ?? 0));
  const left = Math.max(0, Number(task.leftSlots ?? 0));
  const progress = total > 0 ? Math.max(0, Math.min(100, Math.round((used / total) * 100))) : 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <View style={styles.iconWrap}>
          <LinkIcon color={colors.accent} size={18} />
        </View>
        <View style={styles.main}>
          <Text style={styles.title} numberOfLines={1}>
            {task.title}
          </Text>
          <Text style={styles.desc} numberOfLines={1}>
            {task.description}
          </Text>
        </View>
        <Text style={styles.reward}>Rs {task.rewardNet.toFixed(2)}</Text>
      </View>

      <View style={styles.mid}>
        <View style={[styles.diffPill, { borderColor: `${difficultyTone}55`, backgroundColor: `${difficultyTone}16` }]}>
          <Text style={[styles.diffText, { color: difficultyTone }]}>{difficulty}</Text>
        </View>
        <View style={styles.moderatedPill}>
          <Text style={styles.moderatedText}>Moderated</Text>
        </View>
        {total > 0 ? (
          <Text style={styles.slotsMeta}>
            {left} left / {total}
          </Text>
        ) : (
          <Text style={styles.slotsMeta}>{left} left</Text>
        )}
      </View>

      {total > 0 ? (
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${progress}%` }]} />
        </View>
      ) : null}

      <View style={styles.bottom}>
        <View style={[styles.pill, { borderColor: `${badgeColor}55` }]}>
          <BadgeCheck color={badgeColor} size={13} />
          <Text style={[styles.pillText, { color: badgeColor }]}>
            {task.blocked ? "Blocked" : `${task.leftSlots} slots`}
          </Text>
        </View>
        <View style={styles.pill}>
          <Timer color={colors.textMuted} size={13} />
          <Text style={styles.pillText}>{task.timeLabel || `${task.taskCategory}`}</Text>
        </View>
        <LinearGradient colors={gradients.primary} style={styles.start}>
          <Text style={styles.startText}>Start</Text>
        </LinearGradient>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.94 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(69,225,255,0.22)",
    backgroundColor: "#121826",
    padding: 14,
    shadowColor: "#45E1FF",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 6,
  },
  top: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(69,225,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(69,225,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  main: { flex: 1 },
  title: { color: colors.text, fontSize: 15, fontWeight: "900" },
  desc: { color: colors.textMuted, marginTop: 6, fontSize: 12, fontWeight: "600" },
  reward: { color: "#72FFB7", fontSize: 20, fontWeight: "900" },
  mid: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  diffPill: { height: 26, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  diffText: { fontSize: 11, fontWeight: "900" },
  moderatedPill: { height: 26, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", alignItems: "center", justifyContent: "center" },
  moderatedText: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  slotsMeta: { marginLeft: "auto", color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  barTrack: { height: 8, borderRadius: 999, backgroundColor: "#202A40", overflow: "hidden", marginTop: 10 },
  barFill: { height: "100%", borderRadius: 999, backgroundColor: colors.accent },
  bottom: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 },
  pill: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#22304A",
    backgroundColor: "#0F1626",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pillText: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  start: { marginLeft: "auto", height: 32, paddingHorizontal: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  startText: { color: "#09101F", fontWeight: "900", fontSize: 12 },
});
