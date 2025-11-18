# CASO Canvas Companion (Expo prototype)

Cross-platform React Native/Expo prototype that builds Canvas-aware, AI-assisted study schedules with personal calendar blending, user-controlled course visibility, and a 2FA-style login demo.

## Quick start
- Install deps: `npm install` (or `pnpm install`).
- Run: `npx expo start` then open iOS/Android/web from the Expo devtools.
- Demo login: any email/password → code `123456`.

## Environment variables (do not commit secrets)
Create a local `.env` file (gitignored) with:
```
EXPO_PUBLIC_CANVAS_DOMAIN=yourcanvas.instructure.com
EXPO_PUBLIC_CANVAS_TOKEN=your_canvas_token_here
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_key_here
```
These load into the bundle for the prototype only. Avoid using production tokens; rotate tokens after demos.

## Features implemented
- Two-factor style login (dummy code flow).
- Canvas course access toggles and sync button (falls back to mock data if unset/offline).
- Personal events add/edit + include/exclude toggles.
- Preferences for focus window, break length, notification mode, and what the AI should consider.
- AI schedule generation:
  - Local heuristic planner (no network).
  - Gemini API planner (requires `EXPO_PUBLIC_GEMINI_API_KEY`).
- Manual block adjustments (+/- 30m).
- Uses provided `casoLogo.png` for branding; styling in `App.tsx`.

## Notes for demo
- Network calls are not executed automatically in this repo; supply env vars to enable live Canvas/Gemini runs.
- Respect privacy: keep tokens in `.env`, never commit them. The UI shows only course names and assignments pulled for the logged-in user.
- Notifications are represented as toggles only (wire to OneSignal/FCM in a production build).

## Ethical + compliance talking points
- Data minimization: course access toggle limits scope of Canvas data processed by the AI.
- Transparency: UI indicates when data is mocked vs. live.
- Safety: two-factor flow scaffolded; real deployments should use Auth0/OTP delivery, vault-stored secrets, and key rotation.
