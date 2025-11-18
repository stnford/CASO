export type CanvasCourse = {
  id: string;
  name: string;
  allowAccess: boolean;
};

export type Assignment = {
  id: string;
  courseId: string;
  title: string;
  due: string; // ISO string
  weight: "exam" | "project" | "homework";
};

export type PersonalEvent = {
  id: string;
  title: string;
  start: string; // ISO string
  end: string; // ISO string
};

export type Preferences = {
  includeCanvas: boolean;
  includePersonal: boolean;
  considerHabits: string;
  focusStart: string;
  focusEnd: string;
  breakMinutes: number;
  notificationsEnabled: boolean;
  reminderMode: "gentle" | "smart" | "proactive";
};

export type ScheduleBlock = {
  id: string;
  label: string;
  start: string;
  end: string;
  source: "canvas" | "personal" | "ai";
  courseId?: string;
  note?: string;
};
