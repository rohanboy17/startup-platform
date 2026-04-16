import { ScrollView, StyleSheet, Text } from "react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { TaskCard } from "@/components/TaskCard";
import { colors } from "@/lib/theme";

export default function TasksScreen() {
  return (
    <ScreenShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Available Tasks</Text>
        <TaskCard title="App feedback test" reward="Rs 80" tag="Easy" />
        <TaskCard title="Local survey check" reward="Rs 140" tag="Medium" />
        <TaskCard title="Store visit report" reward="Rs 220" tag="Hard" />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
});
