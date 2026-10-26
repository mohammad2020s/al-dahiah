# Running this project on Replit

- Start the app with `bun run dev`.
- The Express server serves the React app, API, and live-audio WebSocket on port `5000`.
- `GEMINI_API_KEY` is needed for Gemini chat, generated speech, and live voice. Without it, chat uses the built-in local fallback; voice and generated speech are unavailable.
- `GOOGLE_WEATHER_API_KEY` or `WEATHER` can provide the Google Weather API key. Without a valid key, the weather endpoint returns built-in fallback weather.
- `GOOGLE_MAPS_API_KEY` must be a Google Cloud API key, not an OAuth client ID. Enable billing and Maps JavaScript API, then restrict the browser key to that API and the app's HTTP referrers.
