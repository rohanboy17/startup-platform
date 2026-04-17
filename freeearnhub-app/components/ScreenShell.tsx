import { LinearGradient } from "expo-linear-gradient";
import { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "@/lib/theme";

export function ScreenShell({ children }: PropsWithChildren) {
  return (
    <View style={styles.screen}>
      <LinearGradient colors={[colors.background, "#111827", colors.background]} style={styles.gradient} />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  glowTop: {
    position: "absolute",
    top: -80,
    left: -40,
    width: 210,
    height: 210,
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.18)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -100,
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: "rgba(79,70,229,0.16)",
  },
});
