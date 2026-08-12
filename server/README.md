# MindBridge Backend

Express + PostgreSQL (via Prisma) API matching the MindBridge system design.

## Setup

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL, JWT secrets, FIELD_ENCRYPTION_KEY, ANTHROPIC_API_KEY

npx prisma migrate dev --name init
node prisma/seed.js       # creates the default assessment template

npm run dev                # starts on http://localhost:4000
```

Generate a `FIELD_ENCRYPTION_KEY` (32 bytes, hex-encoded):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Folder structure

```
src/
  config/db.js          Prisma client singleton
  middleware/            auth (JWT), rbac (roles), validate (Zod), errorHandler
  utils/                 scoring.js (server-side assessment scoring), encryption.js
  services/               aiService.js (chatbot + crisis filter), riskEngine.js (alert rules), auditService.js
  controllers/            business logic per feature
  routes/                 route definitions, wire middleware -> validator -> controller
  validators/             Zod schemas per feature
  index.js                app entry point
prisma/
  schema.prisma           full DB schema
  seed.js                 default assessment template
```

## Key design decisions worth knowing for your defense

- **Scores are always computed server-side** (`utils/scoring.js`) — the client only ever sends raw answers.
- **The AI call lives in exactly one file** (`services/aiService.js`) so swapping providers later is a one-file change.
- **Crisis messages bypass the LLM entirely** — a regex pre-filter in `aiService.js` intercepts self-harm/suicide language before any API call and returns a fixed, reviewed response.
- **Journal content is encrypted at the application layer** (AES-256-GCM) before it's ever written to the database, not just relying on the host's disk encryption.
- **Every counselor view of a student's profile is written to `audit_logs`** automatically — see `dashboard.controller.js`.
- **Risk alerts are rule-based, not ML** (`services/riskEngine.js`) — explainable and defensible in a thesis panel: one high-risk result, or two consecutive moderate results, creates an alert.

## Testing

```bash
npm test
```
Add tests under a `__tests__/` folder — start with `utils/scoring.js` (pure function, easiest to unit test) and one Supertest integration test for `POST /api/auth/register` + `POST /api/auth/login`.
