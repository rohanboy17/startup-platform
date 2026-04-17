import { StyleSheet, Text, View } from "react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { colors } from "@/lib/theme";

export default function WebOnlyScreen() {
  return (
    <ScreenShell>
      <View style={styles.wrap}>
        <Text style={styles.title}>Web Portal Only</Text>
        <Text style={styles.desc}>
          Admin and Manager features are currently available on the web dashboard.
        </Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900" },
  desc: { color: colors.textMuted, fontSize: 13, fontWeight: "600", textAlign: "center", lineHeight: 18 },
});

