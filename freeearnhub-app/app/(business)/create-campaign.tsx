import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Check, ChevronDown, ClipboardList, Plus, Save, X } from "lucide-react-native";

import { ScreenShell } from "@/components/ScreenShell";
import { api, ApiError } from "@/lib/api";
import { colors } from "@/lib/theme";

type WorkTaxonomyOption = { label: string; value: string };
type TaskCategoryOption = { name: string; slug?: string; items: string[]; types?: { slug: string; label: string }[] };

type WorkTaxonomyResponse = {
  campaignCategoryOptions: WorkTaxonomyOption[];
  taskCategories: TaskCategoryOption[];
};

type CampaignCreatePayload = {
  title: string;
  description: string;
  category: string;
  taskCategory: string;
  taskType: string;
  customTask?: string | null;
  taskLink?: string;
  rewardPerTask: number;
  totalBudget: number;
  instructions: string[];
};

function errorText(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

function safeNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getTaskTypes(cat: TaskCategoryOption | undefined) {
  if (!cat) return [];
  if (Array.isArray(cat.items) && cat.items.length) return cat.items;
  if (Array.isArray(cat.types) && cat.types.length) return cat.types.map((t) => t.label);
  return [];
}

function Picker({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = useMemo(() => options.find((o) => o.value === value)?.label || "", [options, value]);

  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [styles.picker, pressed && styles.pressed]}>
        <Text style={[styles.pickerText, !value && styles.pickerPlaceholder]} numberOfLines={1}>
          {value ? selectedLabel || value : placeholder}
        </Text>
        <ChevronDown color={colors.textMuted} size={18} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => null}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}>
                <X color={colors.text} size={16} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              {options.map((opt) => {
                const active = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [styles.optionRow, pressed && styles.pressed, active && styles.optionActive]}
                  >
                    <Text style={styles.optionText}>{opt.label}</Text>
                    {active ? <Check color={colors.accent} size={16} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function CreateCampaignScreen() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [taxonomy, setTaxonomy] = useState<WorkTaxonomyResponse | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [taskCategory, setTaskCategory] = useState("");
  const [taskType, setTaskType] = useState("");
  const [customTask, setCustomTask] = useState("");
  const [taskLink, setTaskLink] = useState("");
  const [rewardPerTask, setRewardPerTask] = useState("10");
  const [totalBudget, setTotalBudget] = useState("500");
  const [instructions, setInstructions] = useState<string[]>([""]);

  const categoryOptions = useMemo(
    () => (taxonomy?.campaignCategoryOptions ?? []).map((o) => ({ label: o.label, value: o.value })),
    [taxonomy?.campaignCategoryOptions]
  );

  const taskCategoryOptions = useMemo(
    () => (taxonomy?.taskCategories ?? []).map((c) => ({ label: c.name, value: c.name })),
    [taxonomy?.taskCategories]
  );

  const selectedTaskCategory = useMemo(
    () => (taxonomy?.taskCategories ?? []).find((c) => c.name === taskCategory),
    [taxonomy?.taskCategories, taskCategory]
  );

  const taskTypeOptions = useMemo(() => {
    const items = getTaskTypes(selectedTaskCategory);
    return items.map((t) => ({ label: t, value: t }));
  }, [selectedTaskCategory]);

  const needsCustom = taskType === "Other";

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await api.get<WorkTaxonomyResponse>("/api/work-taxonomy");
      setTaxonomy(resp.data);
      const defaultCategory = resp.data.campaignCategoryOptions?.[0]?.value ?? "";
      setCategory((prev) => prev || defaultCategory);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    // Reset taskType when changing taskCategory.
    setTaskType("");
    setCustomTask("");
  }, [taskCategory]);

  const canSubmit = Boolean(
    title.trim() &&
      description.trim() &&
      category &&
      taskCategory &&
      taskType &&
      (!needsCustom || customTask.trim()) &&
      safeNumber(rewardPerTask) > 0 &&
      safeNumber(totalBudget) > 0
  );

  const onAddInstruction = () => setInstructions((prev) => [...prev, ""]);

  const onChangeInstruction = (idx: number, value: string) => {
    setInstructions((prev) => prev.map((item, i) => (i === idx ? value : item)));
  };

  const onRemoveInstruction = (idx: number) => {
    setInstructions((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError("");
    try {
      const payload: CampaignCreatePayload = {
        title: title.trim(),
        description: description.trim(),
        category,
        taskCategory,
        taskType,
        customTask: needsCustom ? customTask.trim() : null,
        taskLink: taskLink.trim() || undefined,
        rewardPerTask: safeNumber(rewardPerTask),
        totalBudget: safeNumber(totalBudget),
        instructions: instructions.map((t) => t.trim()).filter(Boolean),
      };
      await api.post("/api/v2/business/campaigns", payload);
      router.replace("/(business)/campaigns");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <View style={styles.left}>
            <ClipboardList color={colors.accent} size={18} />
            <Text style={styles.title}>Create Campaign</Text>
          </View>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <X color={colors.text} size={18} />
          </Pressable>
        </View>

        {loading ? <Text style={styles.muted}>Loading form...</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Basics</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Campaign title"
              placeholderTextColor="#6E7896"
              style={styles.input}
              autoCapitalize="sentences"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What should users do?"
              placeholderTextColor="#6E7896"
              style={[styles.input, { height: 92, textAlignVertical: "top" }]}
              multiline
            />
          </View>

          <Picker
            label="Campaign Category"
            value={category}
            placeholder="Select category"
            options={categoryOptions}
            onChange={setCategory}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Task Classification</Text>
          <Picker
            label="Task Category"
            value={taskCategory}
            placeholder="Select task category"
            options={taskCategoryOptions}
            onChange={setTaskCategory}
          />
          <Picker
            label="Task Type"
            value={taskType}
            placeholder={taskCategory ? "Select task type" : "Select category first"}
            options={taskTypeOptions}
            onChange={setTaskType}
          />
          {needsCustom ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Custom Task</Text>
              <TextInput
                value={customTask}
                onChangeText={setCustomTask}
                placeholder="Write the custom task label"
                placeholderTextColor="#6E7896"
                style={styles.input}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Budget & Link</Text>
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Reward / Task (INR)</Text>
              <TextInput
                value={rewardPerTask}
                onChangeText={setRewardPerTask}
                placeholder="10"
                placeholderTextColor="#6E7896"
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Total Budget (INR)</Text>
              <TextInput
                value={totalBudget}
                onChangeText={setTotalBudget}
                placeholder="500"
                placeholderTextColor="#6E7896"
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Task Link (optional)</Text>
            <TextInput
              value={taskLink}
              onChangeText={setTaskLink}
              placeholder="https://..."
              placeholderTextColor="#6E7896"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeadRow}>
            <Text style={styles.cardTitle}>Instructions</Text>
            <Pressable onPress={onAddInstruction} style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}>
              <Plus color="#09101F" size={14} />
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>
          {instructions.map((val, idx) => (
            <View key={idx} style={styles.instructionRow}>
              <TextInput
                value={val}
                onChangeText={(t) => onChangeInstruction(idx, t)}
                placeholder={`Step ${idx + 1}`}
                placeholderTextColor="#6E7896"
                style={[styles.input, { flex: 1 }]}
              />
              {instructions.length > 1 ? (
                <Pressable onPress={() => onRemoveInstruction(idx)} style={({ pressed }) => [styles.trashBtn, pressed && styles.pressed]}>
                  <X color={colors.textMuted} size={16} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>

        <Pressable onPress={submit} disabled={!canSubmit || busy} style={({ pressed }) => [styles.submit, pressed && styles.pressed, (!canSubmit || busy) && styles.submitDisabled]}>
          <Save color="#09101F" size={16} />
          <Text style={styles.submitText}>{busy ? "Submitting..." : "Submit for Review"}</Text>
        </Pressable>

        <View style={styles.footerHint}>
          <Text style={styles.hintText}>
            Budgets are allocated from your business wallet. Admin review will verify the campaign before it goes live.
          </Text>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900" },
  iconBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", alignItems: "center", justifyContent: "center" },

  card: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14, gap: 12 },
  cardHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },

  field: { gap: 8 },
  fieldLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  input: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#22304A",
    backgroundColor: "#0F1626",
    paddingHorizontal: 12,
    color: colors.text,
    fontWeight: "700",
  },
  row: { flexDirection: "row", gap: 10 },

  picker: { height: 46, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  pickerText: { color: colors.text, fontWeight: "800", flex: 1 },
  pickerPlaceholder: { color: "#6E7896" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.62)", padding: 18, justifyContent: "center" },
  modalCard: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", maxHeight: "78%", overflow: "hidden" },
  modalHead: { padding: 14, borderBottomWidth: 1, borderBottomColor: "#22304A", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { color: colors.text, fontWeight: "900" },
  modalClose: { width: 34, height: 34, borderRadius: 12, borderWidth: 1, borderColor: "#22304A", alignItems: "center", justifyContent: "center", backgroundColor: "#0F1626" },
  optionRow: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1B2740", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  optionActive: { backgroundColor: "rgba(69,225,255,0.08)" },
  optionText: { color: colors.text, fontWeight: "800" },

  instructionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  trashBtn: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#0F1626", alignItems: "center", justifyContent: "center" },
  addBtn: { height: 34, borderRadius: 12, paddingHorizontal: 12, backgroundColor: colors.accent, flexDirection: "row", alignItems: "center", gap: 8 },
  addBtnText: { color: "#09101F", fontWeight: "900", fontSize: 12 },

  submit: { height: 48, borderRadius: 16, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 },
  submitDisabled: { opacity: 0.45 },
  submitText: { color: "#09101F", fontWeight: "900" },

  footerHint: { borderRadius: 18, borderWidth: 1, borderColor: "#22304A", backgroundColor: "#121826", padding: 14 },
  hintText: { color: colors.textMuted, fontWeight: "700", lineHeight: 18 },

  muted: { color: colors.textMuted, fontWeight: "700" },
  error: { color: colors.danger, fontWeight: "800" },
});
