import { Assignment, CanvasCourse, PersonalEvent, Preferences, ScheduleBlock } from "../types";

export const mockCourses: CanvasCourse[] = [
  { id: "cs3377", name: "CS 3377 - Ethics in Computing", allowAccess: true },
  { id: "math2319", name: "MATH 2319 - Statistics", allowAccess: true },
  { id: "hist1301", name: "HIST 1301 - Modern History", allowAccess: false }
];

export const mockAssignments: Assignment[] = [
  {
    id: "a1",
    courseId: "cs3377",
    title: "Position Paper Draft",
    due: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    weight: "project"
  },
  {
    id: "a2",
    courseId: "cs3377",
    title: "Case Study Review",
    due: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    weight: "homework"
  },
  {
    id: "a3",
    courseId: "math2319",
    title: "Midterm Exam",
    due: new Date(Date.now() + 120 * 60 * 60 * 1000).toISOString(),
    weight: "exam"
  }
];

export const mockEvents: PersonalEvent[] = [
  {
    id: "p1",
    title: "Work shift",
    start: new Date(new Date().setHours(15, 0, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(17, 0, 0, 0)).toISOString()
  },
  {
    id: "p2",
    title: "Gym",
    start: new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(19, 0, 0, 0)).toISOString()
  }
];

export const defaultPreferences: Preferences = {
  includeCanvas: true,
  includePersonal: true,
  considerHabits: "I focus best in the morning with short breaks.",
  focusStart: "08:00",
  focusEnd: "18:00",
  breakMinutes: 15,
  notificationsEnabled: true,
  reminderMode: "smart"
};

export const starterSchedule: ScheduleBlock[] = [
  {
    id: "block-1",
    label: "Catch up on Canvas announcements",
    start: new Date(new Date().setHours(8, 30, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
    source: "ai",
    note: "AI generated onboarding task"
  }
];
