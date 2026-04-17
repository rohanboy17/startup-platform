import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { BadgeCheck, Clipboard, ExternalLink, ImagePlus, Link as LinkIcon, Send, Shield, ShieldCheck, Wallet } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { StatusTimeline } from "@/components/StatusTimeline";
import { api } from "@/lib/api";
import { colors, gradients } from "@/lib/theme";

type CampaignInstruction = { id: string; instructionText: string; sequence: number };

type CampaignDetails = {
  campaign: {
    id: string;
    title: string;
    description: string;
    category: string;
    taskCategory: string;
    taskType: string;
    customTask: string | null;
    taskLink: string | null;
    tutorialVideoUrl: string | null;
    rewardPerTask: number;
    leftSubmissions: number;
    blockedBySubmissionMode: boolean;
    blockedByRepeatRule: boolean;
    repeatRequestReason: string | null;
    isAvailable: boolean;
    instructions: CampaignInstruction[];
    currentInstruction: CampaignInstruction | null;
  };
};

export default function UserTaskDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<CampaignDetails | null>(null);

  const [proofLink, setProofLink] = useState("");
  const [proofText, setProofText] = useState("");
  const [proofImage, setProofImage] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<CampaignDetails>(`/api/v2/campaigns/${id}/submissions`);
      setData(resp.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load task");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    load();
  }, [id, load]);

  const isAvailable = Boolean(data?.campaign?.isAvailable);
  const blockedReason = useMemo(() => {
    if (!data?.campaign) return "";
    if (!data.campaign.leftSubmissions) return "No slots left";
    if (data.campaign.blockedBySubmissionMode) return "One-per-user limit reached";
    if (data.campaign.blockedByRepeatRule) return data.campaign.repeatRequestReason || "Repeat access blocked";
    return "";
  }, [data?.campaign]);

  const onSubmit = async () => {
    setSubmitMsg("");
    setSubmitBusy(true);
    try {
      const resp = await api.post(`/api/v2/campaigns/${id}/submissions`, {
        proofLink: proofLink.trim() || undefined,
        proofText: proofText.trim() || undefined,
        proofImage: proofImage.trim() || undefined,
      });
      setSubmitMsg((resp.data as { message?: string })?.message || "Submitted");
      setProofLink("");
      setProofText("");
      setProofImage("");
      setSuccessOpen(true);
    } catch (e) {
      setSubmitMsg(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitBusy(false);
    }
  };

  const stages = [
    { key: "submitted", label: "Submitted", status: "ACTIVE" as const, meta: "Proof uploaded to review pipeline." },
    { key: "manager", label: "Manager Review", status: "PENDING" as const, meta: "Quality checks and escalation." },
    { key: "admin", label: "Admin Review", status: "PENDING" as const, meta: "Final verification and approval." },
    { key: "done", label: "Approved / Rejected", status: "PENDING" as const, meta: "Wallet credit or rejection reason." },
  ];

  return (
    <ScreenShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {data?.campaign?.title || "Task"}
          </Text>
          <View style={{ width: 52 }} />
        </View>

        {loading ? <Text style={styles.muted}>Loading...</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {data?.campaign ? (
          <>
            <LinearGradient colors={gradients.primary} style={styles.rewardCard}>
              <Text style={styles.rewardLabel}>Reward</Text>
              <Text style={styles.rewardValue}>Rs {Number(data.campaign.rewardPerTask || 0).toFixed(2)}</Text>
              <Text style={styles.rewardMeta}>
                {data.campaign.taskCategory} - {data.campaign.taskType}
              </Text>
            </LinearGradient>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How this task works</Text>
              <View style={styles.flowRow}>
                <View style={styles.flowStep}>
                  <View style={styles.flowIcon}>
                    <Send color={colors.accent} size={16} />
                  </View>
                  <Text style={styles.flowLabel}>Submit</Text>
                </View>
                <View style={styles.flowLine} />
                <View style={styles.flowStep}>
                  <View style={[styles.flowIcon, styles.flowIconManager]}>
                    <Shield color={colors.warning} size={16} />
                  </View>
                  <Text style={styles.flowLabel}>Manager</Text>
                </View>
                <View style={styles.flowLine} />
                <View style={styles.flowStep}>
                  <View style={[styles.flowIcon, styles.flowIconAdmin]}>
                    <BadgeCheck color={colors.accentAlt} size={16} />
                  </View>
                  <Text style={styles.flowLabel}>Admin</Text>
                </View>
                <View style={styles.flowLine} />
                <View style={styles.flowStep}>
                  <View style={[styles.flowIcon, styles.flowIconPay]}>
                    <Wallet color={colors.success} size={16} />
                  </View>
                  <Text style={styles.flowLabel}>Payment</Text>
                </View>
              </View>
              <Text style={styles.flowHint}>
                Submit proof first. Manager review happens before admin verification. Wallet credit is added only after approval.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              {(data.campaign.currentInstruction ? [data.campaign.currentInstruction] : data.campaign.instructions).map(
                (ins) => (
                  <View key={ins.id} style={styles.instructionRow}>
                    <View style={styles.dot} />
                    <Text style={styles.instructionText}>{ins.instructionText}</Text>
                  </View>
                )
              )}
              {data.campaign.taskLink ? (
                <Pressable style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}>
                  <ExternalLink color="#09101F" size={16} />
                  <Text style={styles.linkText}>Open Link</Text>
                </Pressable>
              ) : null}
              <Pressable style={({ pressed }) => [styles.linkBtnSecondary, pressed && styles.pressed]}>
                <Clipboard color={colors.text} size={16} />
                <Text style={styles.linkTextSecondary}>Copy Instruction</Text>
              </Pressable>
            </View>

            <View style={styles.section}>
              <View style={styles.safetyRow}>
                <ShieldCheck color={colors.accent} size={16} />
                <Text style={styles.sectionTitle}>Submission</Text>
              </View>
              {!isAvailable ? <Text style={styles.blocked}>Not available: {blockedReason}</Text> : null}

              <View style={styles.inputWrap}>
                <LinkIcon color={colors.textMuted} size={16} />
                <TextInput
                  value={proofLink}
                  onChangeText={setProofLink}
                  placeholder="Proof link (optional)"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>
              <TextInput
                value={proofText}
                onChangeText={setProofText}
                placeholder="Proof note/details (optional)"
                placeholderTextColor={colors.textMuted}
                style={styles.textArea}
                multiline
              />
              <View style={styles.inputWrap}>
                <ImagePlus color={colors.textMuted} size={16} />
                <TextInput
                  value={proofImage}
                  onChangeText={setProofImage}
                  placeholder="Proof image URL (optional)"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>

              <Pressable
                disabled={!isAvailable || submitBusy}
                onPress={onSubmit}
                style={({ pressed }) => [
                  styles.submitBtn,
                  (!isAvailable || submitBusy) && styles.submitDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.submitText}>{submitBusy ? "Submitting..." : "Submit"}</Text>
              </Pressable>
              {submitMsg ? <Text style={styles.muted}>{submitMsg}</Text> : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Review Timeline</Text>
              <StatusTimeline stages={stages} />
            </View>
          </>
        ) : null}
      </ScrollView>

      {successOpen ? (
        <View style={styles.toastWrap}>
            <View style={styles.toast}>
              <View style={styles.toastIcon}>
              <Send color={colors.success} size={18} />
              </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toastTitle}>Submitted</Text>
              <Text style={styles.toastSub} numberOfLines={2}>
                Your proof is now in review. You can track the manager and admin stages in Reviews.
              </Text>
            </View>
          </View>
          <View style={styles.toastActions}>
            <Pressable
              onPress={() => {
                setSuccessOpen(false);
                router.push("/(user)/submissions");
              }}
              style={({ pressed }) => [styles.toastBtn, pressed && styles.pressed]}
            >
              <Text style={styles.toastBtnText}>Track Review</Text>
            </Pressable>
            <Pressable onPress={() => setSuccessOpen(false)} style={({ pressed }) => [styles.toastBtnSecondary, pressed && styles.pressed]}>
              <Text style={styles.toastBtnTextSecondary}>Close</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
  rewardCard: { borderRadius: 18, padding: 18, gap: 8, overflow: "hidden" },
  rewardLabel: { color: "#E9EDFF", fontWeight: "700" },
  rewardValue: { color: "#FFFFFF", fontSize: 34, fontWeight: "900" },
  rewardMeta: { color: "rgba(255,255,255,0.85)", fontWeight: "700" },
  section: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 10 },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  instructionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: colors.accent, marginTop: 6 },
  instructionText: { color: colors.textMuted, fontSize: 12, fontWeight: "600", flex: 1, lineHeight: 18 },
  linkBtn: { height: 44, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  linkText: { color: "#09101F", fontWeight: "900", fontSize: 13 },
  linkBtnSecondary: { height: 44, borderRadius: 14, borderWidth: 1, borderColor: "rgba(69,225,255,0.35)", backgroundColor: "rgba(69,225,255,0.14)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  linkTextSecondary: { color: colors.text, fontWeight: "900", fontSize: 13 },
  safetyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  flowRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  flowStep: { alignItems: "center", justifyContent: "center", gap: 8 },
  flowIcon: { width: 34, height: 34, borderRadius: 14, borderWidth: 1, borderColor: "rgba(124,58,237,0.35)", backgroundColor: "rgba(124,58,237,0.18)", alignItems: "center", justifyContent: "center" },
  flowIconManager: { borderColor: "rgba(245,158,11,0.35)", backgroundColor: "rgba(245,158,11,0.14)" },
  flowIconAdmin: { borderColor: "rgba(79,70,229,0.35)", backgroundColor: "rgba(79,70,229,0.14)" },
  flowIconPay: { borderColor: "rgba(34,197,94,0.35)", backgroundColor: "rgba(34,197,94,0.14)" },
  flowLabel: { color: colors.text, fontWeight: "900", fontSize: 11 },
  flowLine: { flex: 1, height: 2, borderRadius: 999, backgroundColor: "#22304A" },
  flowHint: { color: colors.textMuted, fontWeight: "600", fontSize: 12, lineHeight: 18 },
  blocked: { color: colors.danger, fontWeight: "800" },
  inputWrap: { height: 46, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, height: "100%", color: colors.text, fontWeight: "700" },
  textArea: { minHeight: 90, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontWeight: "700" },
  submitBtn: { height: 46, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: "#09101F", fontWeight: "900", fontSize: 14 },
  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },

  toastWrap: { position: "absolute", left: 16, right: 16, bottom: 16, gap: 10 },
  toast: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 18, borderWidth: 1, borderColor: "rgba(34,197,94,0.28)", backgroundColor: "rgba(34,197,94,0.10)", padding: 12 },
  toastIcon: { width: 34, height: 34, borderRadius: 14, borderWidth: 1, borderColor: "rgba(34,197,94,0.35)", backgroundColor: "rgba(34,197,94,0.12)", alignItems: "center", justifyContent: "center" },
  toastTitle: { color: colors.text, fontWeight: "900" },
  toastSub: { color: colors.textMuted, marginTop: 4, fontWeight: "700", fontSize: 12, lineHeight: 18 },
  toastActions: { flexDirection: "row", gap: 10 },
  toastBtn: { flex: 1, height: 44, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  toastBtnText: { color: "#09101F", fontWeight: "900" },
  toastBtnSecondary: { flex: 1, height: 44, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },
  toastBtnTextSecondary: { color: colors.text, fontWeight: "900" },
});
