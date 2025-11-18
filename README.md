# CASO Canvas Companion (Expo prototype)

Cross-platform prototype that uses React Native and Expo to build Canvas-aware, AI-assisted study schedules that features blending of personal calendars, controlling course visibility, and a 2FA-style login demo.

## How to start the application
- Install deps: `npm install` (or `pnpm install`).
- Might need to run run npx expo install react-native-web react-dom @expo/metro-runtime to use in a web browser.
- Run: `npx expo start` then open iOS/Android/web from the Expo devtools.
- Demo login: any email/password → code `123456`.

## Getting the environment variables (do not commit)
Create a local `.env` file (gitignored) with:
```
EXPO_PUBLIC_CANVAS_DOMAIN=yourcanvas.instructure.com
EXPO_PUBLIC_CANVAS_TOKEN=your_canvas_token_here
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_key_here
```
These load into the bundle for the prototype only. Be sure to avoid using production tokens and rotate tokens after a demo.

## Features implemented so far
- Two-factor login (currently uses a dummy 2FA).
- Canvas course access toggles and sync button (falls back to mock data if it is not set/offline).
- Personal events add/edit option and include/exclude toggles.
- Preferences for focus window, break length, notification mode, and what should be considered by the AI.
- AI schedule generation:
  - Local heuristic planner (no network).
  - Gemini API planner (requires `EXPO_PUBLIC_GEMINI_API_KEY`).
- Manual block adjustments (must click +/-30m).
- Uses CASO logo for branding, and styling is in `App.tsx`.

## Demo usage notes
- Network calls are not executed automatically in this repo. You must supply env vars to enable live Canvas/Gemini runs.
- Be sure to respect privacy: keep tokens in `.env` and never commit them. Also, the UI shows only course names and assignments pulled for the current logged-in user.
- Notifications are represented as toggles only and currently do not function (will wire to OneSignal/FCM in a later build).
