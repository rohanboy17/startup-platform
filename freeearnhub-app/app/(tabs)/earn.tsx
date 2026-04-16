import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ScreenShell } from "@/components/ScreenShell";
import { colors } from "@/lib/theme";

export default function EarnScreen() {
  return (
    <ScreenShell>
      <View style={styles.screen}>
        <Card>
          <Text style={styles.title}>Earn Boost</Text>
          <Text style={styles.value}>Rs 12</Text>
          <Text style={styles.sub}>Watch ad to unlock reward</Text>
          <View style={styles.action}>
            <Button title="Watch Ad" />
          </View>
        </Card>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 16 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  value: { color: '#72FFB7', fontSize: 40, fontWeight: '800', marginTop: 8 },
  sub: { color: colors.textMuted, marginTop: 8 },
  action: { marginTop: 18 },
});
