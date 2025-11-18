import React, { useMemo, useState } from "react";
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { generateSchedule } from "./src/services/aiPlanner";
import { fetchCanvasAssignments, fetchCanvasCourses } from "./src/services/canvasClient";
import { defaultPreferences, mockAssignments, mockCourses, mockEvents, starterSchedule } from "./src/services/mockData";
import { Assignment, CanvasCourse, PersonalEvent, Preferences, ScheduleBlock } from "./src/types";

type AuthStep = "login" | "code" | "app";

export default function App() {
  const [authStep, setAuthStep] = useState<AuthStep>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [courses, setCourses] = useState<CanvasCourse[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [events, setEvents] = useState<PersonalEvent[]>([]);
  const [schedule, setSchedule] = useState<ScheduleBlock[]>([]);
  const [newEvent, setNewEvent] = useState({ title: "", start: "", end: "" });
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState({ canvas: false, gemini: false });
  const [picker, setPicker] = useState<{ field: "start" | "end" | null; date: Date | null }>({
    field: null,
    date: null
  });

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const handleLogin = () => {
    setAuthError(null);
    if (!email || !password) {
      setAuthError("Enter email and password to continue.");
      return;
    }
    setAuthStep("code");
  };

  const handleCode = () => {
    if (code.trim() === "123456") {
      setAuthStep("app");
      return;
    }
    setAuthError("Invalid 2FA code. Try 123456 for the demo.");
  };

  const handleToggleCourse = (id: string) => {
    setCourses(prev => prev.map(course => (course.id === id ? { ...course, allowAccess: !course.allowAccess } : course)));
  };

  const handleGenerate = () => {
    const updated = generateSchedule({
      assignments,
      courses,
      events,
      preferences
    });
    setSchedule(updated);
  };

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.start || !newEvent.end) return;
    const event: PersonalEvent = {
      id: `user-${Date.now()}`,
      title: newEvent.title,
      start: newEvent.start,
      end: newEvent.end
    };
    setEvents(prev => [...prev, event]);
    setNewEvent({ title: "", start: "", end: "" });
  };

  const adjustBlock = (id: string, minutes: number) => {
    setSchedule(prev =>
      prev.map(block => {
        if (block.id !== id) return block;
        const start = shiftTime(block.start, minutes);
        const end = shiftTime(block.end, minutes);
        return { ...block, start, end, note: (block.note ?? "") + " (edited)" };
      })
    );
  };

  const syncCanvas = async () => {
    try {
      setLoading(prev => ({ ...prev, canvas: true }));
      setStatus("Syncing Canvas…");
      const fetchedCourses = await fetchCanvasCourses();
      setCourses(fetchedCourses);
      const allowedCourses = fetchedCourses.filter(c => c.allowAccess).map(c => c.id);
      const fetchedAssignments = await fetchCanvasAssignments(allowedCourses);
      setAssignments(fetchedAssignments);
      setStatus(`Canvas synced (${fetchedCourses.length} courses, ${fetchedAssignments.length} assignments).`);
    } catch (err) {
      setStatus("Canvas sync unavailable. Showing offline data.");
      setCourses(mockCourses);
      setAssignments(mockAssignments);
      setEvents(mockEvents);
      setSchedule(starterSchedule);
    } finally {
      setLoading(prev => ({ ...prev, canvas: false }));
    }
  };

  const filteredSchedule = schedule.filter(block => {
    if (block.source === "canvas") {
      const course = courses.find(c => c.id === block.courseId);
      return !!course?.allowAccess && preferences.includeCanvas;
    }
    if (block.source === "personal") return preferences.includePersonal;
    return true;
  });

  if (authStep !== "app") {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar style="light" />
        <View style={styles.authCard}>
          <Image source={require("./canvasLogo.png")} style={styles.canvasLogo} />
          <Text style={styles.authTitle}>Sign in with your Canvas account</Text>
          <Text style={styles.authSubtitle}>We’ll sync assignments securely and add 2FA (code: 123456 in this demo).</Text>
          {authStep === "login" && (
            <>
              <LabeledInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" variant="auth" />
              <LabeledInput label="Password" value={password} onChangeText={setPassword} secureTextEntry variant="auth" />
              <PrimaryButton label="Send 2FA Code" onPress={handleLogin} variant="auth" />
              <Text style={styles.authHelperText}>Auth0-style 2FA: demo code is 123456.</Text>
            </>
          )}
          {authStep === "code" && (
            <>
              <LabeledInput label="Enter 2FA code" value={code} onChangeText={setCode} keyboardType="numeric" variant="auth" />
              <PrimaryButton label="Verify & Continue" onPress={handleCode} variant="auth" />
              <Text style={styles.authHelperText}>We would normally text/email this code. Using dummy code keeps the flow local.</Text>
            </>
          )}
          {authError && <Text style={styles.errorText}>{authError}</Text>}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.banner}>
          <View>
            <Text style={styles.bannerTitle}>{greeting}, here is your AI-backed plan.</Text>
            <Text style={styles.subtitle}>Canvas assignments, personal calendar, and focus habits in one place.</Text>
          </View>
          <Image source={require("./casoLogo.png")} style={styles.smallLogo} />
        </View>

        <Card title="Canvas access controls">
          <PrimaryButton label={loading.canvas ? "Syncing…" : "Sync Canvas"} onPress={syncCanvas} />
          <Text style={styles.helperText}>Toggle which courses the AI can see.</Text>
          {courses.map(course => (
            <Row key={course.id}>
              <Text style={styles.rowLabel}>{course.name}</Text>
              <Switch value={course.allowAccess} onValueChange={() => handleToggleCourse(course.id)} />
            </Row>
          ))}
        </Card>

        <Card title="Preferences & focus habits">
          <LabeledInput
            label="What should the AI consider?"
            value={preferences.considerHabits}
            onChangeText={text => setPreferences(prev => ({ ...prev, considerHabits: text }))}
            multiline
            styleOverride={styles.fullWidthInput}
          />
          <View style={styles.rowWrap}>
            <InputHalf
              label="Focus start"
              value={preferences.focusStart}
              onChangeText={text => setPreferences(prev => ({ ...prev, focusStart: text }))}
              placeholder="08:00"
            />
            <InputHalf
              label="Focus end"
              value={preferences.focusEnd}
              onChangeText={text => setPreferences(prev => ({ ...prev, focusEnd: text }))}
              placeholder="18:00"
            />
          </View>
          <Row>
            <Text style={styles.rowLabel}>Break minutes</Text>
            <TextInput
              style={styles.inputSm}
              value={String(preferences.breakMinutes)}
              onChangeText={text => setPreferences(prev => ({ ...prev, breakMinutes: Number(text) || 0 }))}
              keyboardType="numeric"
            />
          </Row>
          <Row>
            <Text style={styles.rowLabel}>Include Canvas tasks</Text>
            <Switch value={preferences.includeCanvas} onValueChange={value => setPreferences(prev => ({ ...prev, includeCanvas: value }))} />
          </Row>
          <Row>
            <Text style={styles.rowLabel}>Include personal calendar</Text>
            <Switch
              value={preferences.includePersonal}
              onValueChange={value => setPreferences(prev => ({ ...prev, includePersonal: value }))}
            />
          </Row>
          <Row>
            <Text style={styles.rowLabel}>Allow notifications</Text>
            <Switch
              value={preferences.notificationsEnabled}
              onValueChange={value => setPreferences(prev => ({ ...prev, notificationsEnabled: value }))}
            />
          </Row>
          <Text style={styles.rowLabel}>Reminder style</Text>
          <Segmented
            value={preferences.reminderMode}
            options={[
              { label: "Gentle", value: "gentle" },
              { label: "Smart", value: "smart" },
              { label: "Pro", value: "proactive" }
            ]}
            onSelect={value => setPreferences(prev => ({ ...prev, reminderMode: value as Preferences["reminderMode"] }))}
          />
        </Card>

        <Card title="Personal calendar">
          <Text style={styles.helperText}>Add personal events to block out time.</Text>
          <LabeledInput
            label="Title"
            value={newEvent.title}
            onChangeText={text => setNewEvent(prev => ({ ...prev, title: text }))}
          />
          <DateTimeField
            label="Start"
            value={newEvent.start}
            onPick={iso => setNewEvent(prev => ({ ...prev, start: iso }))}
            openPicker={() =>
              setPicker({
                field: "start",
                date: newEvent.start ? new Date(newEvent.start) : new Date()
              })
            }
          />
          <DateTimeField
            label="End"
            value={newEvent.end}
            onPick={iso => setNewEvent(prev => ({ ...prev, end: iso }))}
            openPicker={() =>
              setPicker({
                field: "end",
                date: newEvent.end ? new Date(newEvent.end) : new Date()
              })
            }
          />
          <PrimaryButton label="Add event" onPress={handleAddEvent} />
          <View style={styles.tagRow}>
            {events.map(evt => (
              <View key={evt.id} style={styles.tag}>
                <Text style={styles.tagText}>{evt.title}</Text>
              </View>
            ))}
          </View>
        </Card>
        {picker.field && (
          <View style={styles.pickerSheet}>
            <DateTimePicker
              value={picker.date ?? new Date()}
              mode="datetime"
              display="spinner"
              onChange={(_, selectedDate) => {
                if (selectedDate) {
                  setPicker(prev => ({ ...prev, date: selectedDate }));
                }
              }}
            />
            <View style={styles.pickerActions}>
              <SecondaryButton label="Cancel" onPress={() => setPicker({ field: null, date: null })} />
              <PrimaryButton
                label="Set time"
                onPress={() => {
                  const iso = (picker.date ?? new Date()).toISOString();
                  if (picker.field === "start") {
                    setNewEvent(prev => ({ ...prev, start: iso }));
                  } else {
                    setNewEvent(prev => ({ ...prev, end: iso }));
                  }
                  setPicker({ field: null, date: null });
                }}
              />
            </View>
          </View>
        )}

        <Card title="AI powered schedule">
          <Text style={styles.helperText}>Tap generate to merge Canvas, calendars, and your preferences.</Text>
          <PrimaryButton label="Generate schedule" onPress={handleGenerate} />
          {status && <Text style={styles.helperText}>{status}</Text>}
          {filteredSchedule.map(block => (
            <View key={block.id} style={styles.scheduleItem}>
              <Text style={styles.scheduleTitle}>{block.label}</Text>
              <View style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineBar} />
                <Text style={styles.scheduleTime}>
                  {formatTime(block.start)} → {formatTime(block.end)} ({durationMinutes(block)} min)
                </Text>
              </View>
              <Text style={styles.scheduleMeta}>
                Source: {block.source.toUpperCase()}
                {block.courseId ? ` • ${block.courseId}` : ""}
              </Text>
              {!!block.note && <Text style={styles.helperText}>{block.note}</Text>}
              <View style={styles.scheduleActions}>
                <Text style={styles.helperText}>Need to tweak? Move the block.</Text>
                <View style={styles.actionRow}>
                  <SecondaryButton label="-30m" onPress={() => adjustBlock(block.id, -30)} />
                  <SecondaryButton label="+30m" onPress={() => adjustBlock(block.id, 30)} />
                </View>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const formatTime = (iso: string) => {
  const date = new Date(iso);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

const shiftTime = (iso: string, minutes: number) => new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString();

const durationMinutes = (block: ScheduleBlock) =>
  Math.max(1, Math.round((new Date(block.end).getTime() - new Date(block.start).getTime()) / 60000));

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {children}
  </View>
);

const Row = ({ children }: { children: React.ReactNode }) => <View style={styles.row}>{children}</View>;

const PrimaryButton = ({
  label,
  onPress,
  variant = "default"
}: {
  label: string;
  onPress: () => void;
  variant?: "default" | "auth";
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.primaryButton, variant === "auth" && styles.primaryButtonAuth]}
  >
    <Text style={[styles.primaryLabel, variant === "auth" && styles.primaryLabelAuth]}>{label}</Text>
  </TouchableOpacity>
);

const SecondaryButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={styles.secondaryButton}>
    <Text style={styles.secondaryLabel}>{label}</Text>
  </TouchableOpacity>
);

const LabeledInput = ({
  label,
  value,
  onChangeText,
  multiline = false,
  styleOverride,
  variant = "default",
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  styleOverride?: any;
  variant?: "default" | "auth";
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "numeric" | "email-address";
  placeholder?: string;
}) => (
  <View style={styles.inputWrapper}>
    <Text style={[styles.label, variant === "auth" && styles.authLabel]}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      style={[
        styles.input,
        multiline && styles.inputMultiline,
        variant === "auth" && styles.authInput,
        styleOverride
      ]}
      placeholderTextColor="#A4B1C4"
      multiline={multiline}
      {...props}
    />
  </View>
);

const InputHalf = ({
  label,
  value,
  onChangeText,
  placeholder
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) => (
  <View style={styles.inputHalf}>
    <LabeledInput label={label} value={value} onChangeText={onChangeText} placeholder={placeholder} />
  </View>
);

const Segmented = ({
  options,
  value,
  onSelect
}: {
  options: { label: string; value: string }[];
  value: string;
  onSelect: (value: string) => void;
  }) => (
  <View style={styles.segment}>
    {options.map(option => {
      const selected = option.value === value;
      return (
        <TouchableOpacity
          key={option.value}
          onPress={() => onSelect(option.value)}
          style={[styles.segmentItem, selected && styles.segmentItemSelected]}
        >
          <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>{option.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

  const DateTimeField = ({
  label,
  value,
  onPick,
  openPicker
}: {
  label: string;
  value: string;
  onPick: (iso: string) => void;
  openPicker: () => void;
}) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.label}>{label}</Text>
    <TouchableOpacity style={styles.dateButton} onPress={openPicker}>
      <Text style={styles.dateButtonText}>{value ? formatTime(value) : "Select date & time"}</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A2540",
    paddingTop: Constants.statusBarHeight
  },
  scroll: {
    padding: 16,
    paddingBottom: 32
  },
  authContainer: {
    flex: 1,
    backgroundColor: "#b71c1c",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  authCard: {
    width: "100%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#e53935",
    maxWidth: 480
  },
  card: {
    backgroundColor: "#0F3562",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 8
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6
  },
  rowWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  rowLabel: {
    color: "white",
    fontSize: 16,
    flex: 1,
    paddingRight: 8
  },
  title: {
    fontSize: 22,
    color: "white",
    fontWeight: "700",
    marginBottom: 6
  },
  subtitle: {
    fontSize: 14,
    color: "#D9E5FF",
    marginBottom: 12
  },
  authTitle: {
    fontSize: 22,
    color: "#b71c1c",
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center"
  },
  authSubtitle: {
    fontSize: 14,
    color: "#7f0000",
    marginBottom: 12,
    textAlign: "center"
  },
  banner: {
    backgroundColor: "#123A6B",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  bannerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8
  },
  logo: {
    width: 82,
    height: 82,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 12
  },
  canvasLogo: {
    width: 110,
    height: 110,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 10
  },
  smallLogo: {
    width: 44,
    height: 44,
    resizeMode: "contain",
    marginLeft: 12,
    alignSelf: "center"
  },
  inputWrapper: {
    marginBottom: 12
  },
  label: {
    color: "#D9E5FF",
    marginBottom: 6,
    fontWeight: "600"
  },
  authLabel: {
    color: "#b71c1c"
  },
  input: {
    backgroundColor: "#0B2A4A",
    color: "white",
    padding: 12,
    borderRadius: 12,
    borderColor: "#1E4B85",
    borderWidth: 1
  },
  authInput: {
    backgroundColor: "#fff5f5",
    color: "#7f0000",
    borderColor: "#ef9a9a"
  },
  inputMultiline: {
    minHeight: 64,
    textAlignVertical: "top"
  },
  inputSm: {
    backgroundColor: "#0B2A4A",
    color: "white",
    padding: 10,
    width: 72,
    borderRadius: 12,
    borderColor: "#1E4B85",
    borderWidth: 1,
    textAlign: "center"
  },
  inputHalf: {
    flex: 1
  },
  primaryButton: {
    backgroundColor: "#33C3F0",
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    marginTop: 4
  },
  primaryButtonAuth: {
    backgroundColor: "#d32f2f",
    borderColor: "#b71c1c",
    borderWidth: 1
  },
  primaryLabel: {
    color: "#0A2540",
    fontWeight: "700",
    fontSize: 16
  },
  primaryLabelAuth: {
    color: "white"
  },
  secondaryButton: {
    backgroundColor: "#0B2A4A",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E4B85"
  },
  secondaryLabel: {
    color: "#D9E5FF",
    fontWeight: "600"
  },
  helperText: {
    color: "#A4B1C4",
    fontSize: 13,
    marginTop: 6
  },
  authHelperText: {
    color: "#7f0000",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center"
  },
  errorText: {
    color: "#FF6B6B",
    marginTop: 8
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#0B2A4A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E4B85",
    padding: 4,
    marginTop: 12,
    justifyContent: "space-between"
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8
  },
  segmentItemSelected: {
    backgroundColor: "white"
  },
  segmentLabel: {
    color: "#BBD1F7",
    fontWeight: "600"
  },
  segmentLabelSelected: {
    color: "#0A2540"
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8
  },
  tag: {
    backgroundColor: "#0B2A4A",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E4B85"
  },
  tagText: {
    color: "white"
  },
  scheduleItem: {
    backgroundColor: "#0B2A4A",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderColor: "#1E4B85",
    borderWidth: 1
  },
  scheduleTitle: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 4
  },
  scheduleTime: {
    color: "#BBD1F7",
    marginBottom: 6,
    fontSize: 13
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#33C3F0"
  },
  timelineBar: {
    flex: 1,
    height: 2,
    backgroundColor: "#1E4B85",
    borderRadius: 2
  },
  scheduleMeta: {
    color: "#9AB5DA",
    marginTop: 4,
    fontSize: 13
  },
  scheduleActions: {
    marginTop: 8
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4
  },
  dateButton: {
    backgroundColor: "#0B2A4A",
    padding: 12,
    borderRadius: 12,
    borderColor: "#1E4B85",
    borderWidth: 1
  },
  dateButtonText: {
    color: "white",
    fontSize: 16
  },
  fullWidthInput: {
    width: "100%"
  },
  pickerSheet: {
    marginTop: 12,
    backgroundColor: "#f5f7fb",
    borderRadius: 12,
    padding: 12,
    borderColor: "#d0d7e2",
    borderWidth: 1
  },
  pickerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8
  }
});
