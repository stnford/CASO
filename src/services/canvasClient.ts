import Constants from "expo-constants";
import { Assignment, CanvasCourse } from "../types";

type CanvasCourseResponse = {
  id: number;
  name: string;
  course_code: string;
};

type CanvasAssignmentResponse = {
  id: number;
  name: string;
  due_at: string | null;
  course_id: number;
};

const getEnv = (key: string): string | undefined => {
  // Expo makes only EXPO_PUBLIC_ vars available in the bundle; fall back to app.json extras for local demos.
  return process.env[key] || (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined)?.[key];
};

export const fetchCanvasCourses = async (): Promise<CanvasCourse[]> => {
  const domain = getEnv("EXPO_PUBLIC_CANVAS_DOMAIN");
  const token = getEnv("EXPO_PUBLIC_CANVAS_TOKEN");
  if (!domain || !token) throw new Error("Canvas domain or token missing. Set EXPO_PUBLIC_CANVAS_DOMAIN and EXPO_PUBLIC_CANVAS_TOKEN.");

  const res = await fetch(`https://${domain}/api/v1/courses?per_page=50&enrollment_state=active`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const body = await safeText(res);
    throw new Error(`Canvas courses failed: ${res.status} ${body}`);
  }
  const data: CanvasCourseResponse[] = await res.json();
  return data.map(course => ({
    id: String(course.id),
    name: course.name || course.course_code || `Course ${course.id}`,
    allowAccess: true
  }));
};

export const fetchCanvasAssignments = async (courseIds: string[]): Promise<Assignment[]> => {
  const domain = getEnv("EXPO_PUBLIC_CANVAS_DOMAIN");
  const token = getEnv("EXPO_PUBLIC_CANVAS_TOKEN");
  if (!domain || !token) throw new Error("Canvas domain or token missing. Set EXPO_PUBLIC_CANVAS_DOMAIN and EXPO_PUBLIC_CANVAS_TOKEN.");

  const assignments: Assignment[] = [];
  for (const courseId of courseIds) {
    const res = await fetch(`https://${domain}/api/v1/courses/${courseId}/assignments?bucket=upcoming&per_page=50`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const body = await safeText(res);
      throw new Error(`Assignments failed for course ${courseId}: ${res.status} ${body}`);
    }
    const data: CanvasAssignmentResponse[] = await res.json();
    assignments.push(
      ...data
        .filter(item => !!item.due_at)
        .map(item => ({
          id: String(item.id),
          courseId,
          title: item.name || `Assignment ${item.id}`,
          due: item.due_at || new Date().toISOString(),
          weight: (item.name?.toLowerCase().includes("exam")
            ? "exam"
            : item.name?.toLowerCase().includes("project")
            ? "project"
            : "homework") as Assignment["weight"]
        }))
    );
  }
  return assignments;
};

const safeText = async (res: Response) => {
  try {
    return await res.text();
  } catch {
    return "";
  }
};
