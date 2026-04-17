import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { BriefcaseBusiness, MessageCircle, RefreshCw, Send } from "lucide-react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { StatusTimeline } from "@/components/StatusTimeline";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";
import { useAuth } from "@/store/auth-store";

type ApplicationRow = {
  id: string;
  status: string;
  managerStatus: string;
  adminStatus: string;
  managerReason: string | null;
  adminReason: string | null;
  coverNote: string | null;
  businessNote: string | null;
  interviewAt: string | null;
  joinedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  job: {
    id: string;
    title: string;
    businessName: string;
    city: string;
    state: string;
    workMode: string;
    employmentType: string;
    payAmount: number;
    payUnit: string;
    status: string;
  };
};

type JobApplicationsResp = { applications: ApplicationRow[] };

type ChatMessage = {
  id: string;
  message: string;
  createdAt: string;
  senderRole: string;
  senderUserId: string;
  senderName: string | null;
};

type ChatResp = {
  canSend: boolean;
  visibleToAdmin: boolean;
  messages: ChatMessage[];
  thread: { applicationId: string; status: string; businessName: string; jobTitle: string };
};

function stageFromStatus(status: string) {
  if (status === "APPLIED") return "APPLIED";
  if (status === "SHORTLISTED") return "SHORTLISTED";
  if (status === "INTERVIEW_SCHEDULED") return "INTERVIEW";
  if (status === "HIRED") return "HIRED";
  if (status === "JOINED") return "JOINED";
  if (status === "REJECTED") return "REJECTED";
  if (status === "WITHDRAWN") return "WITHDRAWN";
  return "APPLIED";
}

export default function UserJobApplicationDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id || "";
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [row, setRow] = useState<ApplicationRow | null>(null);

  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState("");
  const [chat, setChat] = useState<ChatResp | null>(null);
  const [draft, setDraft] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<JobApplicationsResp>("/api/v2/users/me/job-applications");
      const found = (resp.data.applications || []).find((a) => a.id === id) || null;
      setRow(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load application");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadChat = useCallback(async () => {
    if (!id) return;
    setChatLoading(true);
    setChatError("");
    try {
      const resp = await api.get<ChatResp>(`/api/v2/users/me/job-applications/${id}/messages`);
      setChat(resp.data);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Failed to load chat");
    } finally {
      setChatLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    load();
    loadChat();
    const t = setInterval(() => loadChat(), 8000);
    return () => clearInterval(t);
  }, [id, load, loadChat]);

  const stages = useMemo(() => {
    if (!row) return [];
    const stage = stageFromStatus(row.status);
    const applied = new Date(row.createdAt).toLocaleString();
    const adminMeta =
      row.adminStatus && row.adminStatus !== "PENDING"
        ? row.adminStatus.replaceAll("_", " ")
        : "Waiting for admin review";

    const interviewMeta = row.interviewAt ? new Date(row.interviewAt).toLocaleString() : "Interview updates appear here";
    const finalMeta =
      row.status === "REJECTED"
        ? (row.adminReason || row.managerReason || "Rejected")
        : row.status === "WITHDRAWN"
          ? "Withdrawn by you"
          : row.status.replaceAll("_", " ");

    return [
      { key: "applied", label: "Applied", status: "DONE" as const, meta: applied, tone: "success" as const },
      {
        key: "admin",
        label: "Admin Review",
        status: row.adminStatus === "PENDING" ? ("ACTIVE" as const) : ("DONE" as const),
        meta: adminMeta,
        tone: "info" as const,
      },
      {
        key: "interview",
        label: "Interview",
        status: stage === "INTERVIEW" || stage === "HIRED" || stage === "JOINED" ? ("ACTIVE" as const) : ("PENDING" as const),
        meta: interviewMeta,
        tone: "warning" as const,
      },
      {
        key: "final",
        label: "Outcome",
        status: ["HIRED", "JOINED", "REJECTED", "WITHDRAWN"].includes(row.status) ? ("ACTIVE" as const) : ("PENDING" as const),
        meta: finalMeta,
        tone: row.status === "HIRED" || row.status === "JOINED" ? ("success" as const) : row.status === "REJECTED" ? ("danger" as const) : ("muted" as const),
      },
    ];
  }, [row]);

  const onSend = async () => {
    if (!id) return;
    const message = draft.trim();
    if (!message) return;
    setSendBusy(true);
    setToast("");
    try {
      const resp = await api.post(`/api/v2/users/me/job-applications/${id}/messages`, { message });
      setToast((resp.data as { message?: string })?.message || "Sent");
      setDraft("");
      await loadChat();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSendBusy(false);
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
            Application
          </Text>
          <Pressable onPress={() => { load(); loadChat(); }} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <RefreshCw color={colors.text} size={18} />
          </Pressable>
        </View>

        {loading ? <Text style={styles.muted}>Loading...</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !error && !row ? <Text style={styles.muted}>Application not found.</Text> : null}

        {row ? (
          <>
            <View style={styles.card}>
              <View style={styles.headRow}>
                <View style={styles.iconWrap}>
                  <BriefcaseBusiness color={colors.accent} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.h1} numberOfLines={1}>
                    {row.job.title}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {row.job.businessName} - {row.job.city}, {row.job.state}
                  </Text>
                </View>
                <Text style={styles.pay}>
                  Rs {Number(row.job.payAmount || 0).toFixed(0)}
                  <Text style={styles.payUnit}>/{row.job.payUnit.toLowerCase()}</Text>
                </Text>
              </View>
              {row.adminReason || row.managerReason ? (
                <Text style={styles.reason} numberOfLines={3}>
                  {row.adminReason || row.managerReason}
                </Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Timeline</Text>
              <StatusTimeline stages={stages} />
            </View>

            <View style={styles.card}>
              <View style={styles.chatHead}>
                <View style={styles.chatIcon}>
                  <MessageCircle color={colors.accent} size={16} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Messages</Text>
                  <Text style={styles.hint} numberOfLines={2}>
                    Chat opens only after admin approves your application for business review. Contact details are blocked and visible to admin.
                  </Text>
                </View>
              </View>

              {chatError ? <Text style={styles.error}>{chatError}</Text> : null}
              {toast ? <Text style={styles.muted}>{toast}</Text> : null}
              {chatLoading ? <Text style={styles.muted}>Loading chat...</Text> : null}

              <View style={styles.chatList}>
                {(chat?.messages ?? []).slice(-30).map((m) => {
                  const mine = m.senderUserId === user?.id || m.senderRole === "USER";
                  return (
                    <View key={m.id} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                      <Text style={styles.bubbleText}>{m.message}</Text>
                      <Text style={styles.bubbleMeta}>
                        {mine ? "You" : (m.senderName || "Business")} - {new Date(m.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  );
                })}
                {!chatLoading && !chatError && (chat?.messages?.length ?? 0) === 0 ? (
                  <Text style={styles.muted}>No messages yet.</Text>
                ) : null}
              </View>

              <View style={styles.sendRow}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={chat?.canSend ? "Type a message..." : "Chat locked until admin approval"}
                  placeholderTextColor={colors.textMuted}
                  editable={Boolean(chat?.canSend) && !sendBusy}
                  style={[styles.input, !chat?.canSend && styles.inputDisabled]}
                  multiline
                />
                <Pressable
                  onPress={onSend}
                  disabled={!chat?.canSend || sendBusy}
                  style={({ pressed }) => [styles.sendBtn, pressed && styles.pressed, (!chat?.canSend || sendBusy) && styles.disabled]}
                >
                  <Send color="#09101F" size={16} />
                </Pressable>
              </View>
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
  iconBtn: { width: 40, height: 36, borderRadius: 12, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  headRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: "rgba(69,225,255,0.25)", backgroundColor: "rgba(69,225,255,0.10)", alignItems: "center", justifyContent: "center" },
  h1: { color: colors.text, fontSize: 16, fontWeight: "900" },
  meta: { color: colors.textMuted, marginTop: 6, fontWeight: "700", fontSize: 12 },
  pay: { color: "#72FFB7", fontSize: 16, fontWeight: "900" },
  payUnit: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  reason: { color: colors.textMuted, fontWeight: "700", fontSize: 12, lineHeight: 18 },
  sectionTitle: { color: colors.text, fontWeight: "900" },
  chatHead: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  chatIcon: { width: 32, height: 32, borderRadius: 14, borderWidth: 1, borderColor: "rgba(124,58,237,0.35)", backgroundColor: "rgba(124,58,237,0.18)", alignItems: "center", justifyContent: "center" },
  hint: { color: colors.textMuted, fontWeight: "600", fontSize: 12, lineHeight: 18, marginTop: 4 },
  chatList: { gap: 10, marginTop: 6 },
  bubble: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 6 },
  bubbleMine: { alignSelf: "flex-end", borderColor: "rgba(124,58,237,0.35)", backgroundColor: "rgba(124,58,237,0.14)" },
  bubbleOther: { alignSelf: "flex-start", borderColor: "#22304A", backgroundColor: "#0F1626" },
  bubbleText: { color: colors.text, fontWeight: "700", fontSize: 12, lineHeight: 18 },
  bubbleMeta: { color: colors.textMuted, fontWeight: "700", fontSize: 10 },
  sendRow: { flexDirection: "row", gap: 10, alignItems: "flex-end", marginTop: 8 },
  input: { flex: 1, minHeight: 46, maxHeight: 120, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontWeight: "700" },
  inputDisabled: { opacity: 0.7 },
  sendBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.5 },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
});

