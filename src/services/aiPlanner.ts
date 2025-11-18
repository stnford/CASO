import { Assignment, CanvasCourse, PersonalEvent, Preferences, ScheduleBlock } from "../types";

const addMinutes = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString();

const clampToFocus = (iso: string, preferences: Preferences) => {
  const date = new Date(iso);
  const [focusStartHour, focusStartMinute] = preferences.focusStart.split(":").map(Number);
  const [focusEndHour, focusEndMinute] = preferences.focusEnd.split(":").map(Number);
  const focusStart = new Date(date);
  focusStart.setHours(focusStartHour, focusStartMinute, 0, 0);
  const focusEnd = new Date(date);
  focusEnd.setHours(focusEndHour, focusEndMinute, 0, 0);
  if (date < focusStart) return focusStart.toISOString();
  if (date > focusEnd) {
    focusStart.setDate(focusStart.getDate() + 1);
    return focusStart.toISOString();
  }
  return iso;
};

const describeReminder = (preferences: Preferences) => {
  switch (preferences.reminderMode) {
    case "gentle":
      return "Gentle reminders at the start of each block.";
    case "proactive":
      return "Extra reminders with check-ins on progress mid-block.";
    default:
      return "Smart reminders that adapt if work spills over.";
  }
};

export function generateSchedule(opts: {
  assignments: Assignment[];
  courses: CanvasCourse[];
  events: PersonalEvent[];
  preferences: Preferences;
}): ScheduleBlock[] {
  const { assignments, courses, events, preferences } = opts;
  const allowedCourseIds = courses.filter(c => c.allowAccess).map(c => c.id);
  const courseLookup = new Map(courses.map(c => [c.id, c.name]));

  const courseAssignments = assignments
    .filter(a => allowedCourseIds.includes(a.courseId))
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

  const baseBlocks: ScheduleBlock[] = courseAssignments.map((assignment, index) => {
    const dueDate = new Date(assignment.due);
    const start = clampToFocus(
      new Date(dueDate.getTime() - (index + 3) * 60 * 60 * 1000).toISOString(),
      preferences
    );
    const end = addMinutes(
      start,
      assignment.weight === "exam" ? 120 : assignment.weight === "project" ? 90 : 60
    );
    return {
      id: `canvas-${assignment.id}`,
      label: `${courseLookup.get(assignment.courseId) ?? "Course"}: ${assignment.title}`,
      start,
      end,
      source: "canvas",
      courseId: assignment.courseId,
      note: `Prioritize because due ${dueDate.toLocaleString()}.`
    };
  });

  const personalBlocks: ScheduleBlock[] = preferences.includePersonal
    ? events.map(evt => ({
        id: `personal-${evt.id}`,
        label: evt.title,
        start: evt.start,
        end: evt.end,
        source: "personal",
        note: "Synced from personal calendar."
      }))
    : [];

  const aiSummary: ScheduleBlock = {
    id: "ai-personalized",
    label: "AI Study Sprint",
    start: clampToFocus(new Date().toISOString(), preferences),
    end: clampToFocus(addMinutes(new Date().toISOString(), 90), preferences),
    source: "ai",
    note: `Consider habits: ${preferences.considerHabits}. ${describeReminder(preferences)}`
  };

  const combined = [...personalBlocks, ...baseBlocks, aiSummary];
  return combined.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}
