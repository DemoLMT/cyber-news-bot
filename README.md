# WebsiteNewPost — local static site + minimal backend

This workspace contains a static Next.js export (in `frontend/`) and a minimal backend that:

- Serves the static frontend
- Provides `/api/digest` to run the local Python agent (`backend/scripts/run_agent.py`)

Quick start

1. Install Node dependencies:

```powershell
npm install
```

2. Start the full application:

```powershell
npm start
```

3. Open the website in your browser:

```powershell
http://localhost:3000
```

4. Use the chatbot endpoints:

- `GET /api/cyber/newsletters`
- `POST /api/cyber/telegram-trigger`

Optional developer commands:

```powershell
npm run start-backend
npm run start-frontend
npm run agent-dry
npm run agent-run
```

If you want real Telegram delivery, set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in your environment.

Environment

- The agent will look for `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` environment variables when sending notifications.
- See `backend/.env.example` for expected env names.
