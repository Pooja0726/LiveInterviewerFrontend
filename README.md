# LiveInterviewer frontend

Talks directly to each backend service (bypassing the API Gateway for now,
since that hasn't been confirmed stable). See `.env.example`.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Opens at http://localhost:5173.

## Before you can test end to end, have running:

1. Eureka server (port 8761)
2. Auth service (port 8081) — with `auth_db` created
3. User service (port 8082) — with `user_db` created
4. Session service (port 8083) — with `session_db` created
5. AI-Gateway service (port 8085) — with a valid `groq.api.key` set
6. Scorecard service (port 8084) — with `scorecard_db` created

The API Gateway is NOT required for this frontend to work right now.

## Testing flow

1. Register a new account
2. Click "Start a new interview" — pick a style, role, optionally upload a
   resume/JD (PDF or DOCX)
3. You'll land on the live interview screen — a WebSocket connects
   automatically. The interviewer's opening message should appear within
   a few seconds (this is the first real Groq API call)
4. Type a response, hit Send — watch the network tab / Session service
   logs to confirm it's calling AI-Gateway and getting a real reply back
5. Work through the stages; when the interview finishes, you'll land on
   the evaluation page automatically

## If the WebSocket won't connect

- Check the browser console for the exact error
- Confirm Session service is actually running on 8083
- Confirm your JWT hasn't expired (default 1 hour) — log out and back in
- CORS: this app calls services directly from the browser; if you see a
  CORS error, that specific backend service needs a CORS config allowing
  `http://localhost:5173` (none of the individual services have this yet
  — only the API Gateway does. If you hit this, ask for a per-service
  CORS fix, or switch to routing through the Gateway once it's stable)
