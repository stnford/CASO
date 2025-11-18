import Constants from "expo-constants";
import { Assignment, PersonalEvent, Preferences, ScheduleBlock } from "../types";

const model = "gemini-1.5-flash-latest";

const getEnv = (key: string): string | undefined => {
  return process.env[key] || (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined)?.[key];
};

export async function requestGeminiPlan(input: {
  assignments: Assignment[];
  events: PersonalEvent[];
  preferences: Preferences;
}): Promise<ScheduleBlock[]> {
  const apiKey = getEnv("EXPO_PUBLIC_GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("Missing EXPO_PUBLIC_GEMINI_API_KEY. Add it to a local .env (not committed).");
  }

  const prompt = buildPrompt(input.assignments, input.events, input.preferences);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      })
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini request failed: ${res.status}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned no content.");
  }

  const parsed = parseScheduleFromMarkdown(text);
  if (parsed.length === 0) throw new Error("Could not parse schedule from Gemini response.");
  return parsed;
}

const buildPrompt = (assignments: Assignment[], events: PersonalEvent[], preferences: Preferences) => {
  const assignmentList = assignments
    .map(a => `- ${a.title} (course ${a.courseId}), due ${a.due}, type ${a.weight}`)
    .join("\n");
  const eventList = events.map(e => `- ${e.title}: ${e.start} to ${e.end}`).join("\n");
  return `
You are an AI study scheduler. Create a time-boxed daily plan formatted as lines with "label | start ISO | end ISO | source (ai/canvas/personal) | note".
Constraints:
- Obey user focus window ${preferences.focusStart} to ${preferences.focusEnd} and prefer ${preferences.breakMinutes} minute breaks between tasks.
- Use smart reminders mode: ${preferences.reminderMode}; notificationsEnabled=${preferences.notificationsEnabled}.
- Maintain respect of personal events (busy).
- Keep tasks concise and merge Canvas assignments with personal tasks.
- Only output the schedule lines, no prose.

Canvas assignments:
${assignmentList}

Personal events:
${eventList}

Habits and preferences: ${preferences.considerHabits}
  `.trim();
};

const parseScheduleFromMarkdown = (text: string): ScheduleBlock[] => {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .filter(line => line.includes("|"));

  return lines.map((line, idx) => {
    const parts = line.split("|").map(p => p.trim());
    const [label, start, end, source = "ai", note = ""] = parts;
    return {
      id: `gemini-${idx}`,
      label: label || `Task ${idx + 1}`,
      start,
      end,
      source: source === "canvas" || source === "personal" ? source : "ai",
      note
    };
  });
};
