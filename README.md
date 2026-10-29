# CHILD-SAFE

Integrated Child Labour Reporting, Protection & Rehabilitation Platform. Prototype. All demo data is fictional.

## 1. Folder structure
```
child-safe/
  docs/ARCHITECTURE.md
  backend/
    scripts/gen-env.js
    src/ config/ controllers/ middleware/ models/ routes/ services/ utils/ validators/
    src/app.ts  server.ts  seed.ts
    .env.example
  frontend/
    src/ api/ auth/ components/ pages/{report,staff}/ App.tsx main.tsx theme.ts constants.ts
    vite.config.ts  .env.example
```

## 2. Prerequisites
Node.js 20+, MongoDB 6+ running locally (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas URI.
Quick local MongoDB with Docker: `docker run -d --name childsafe-mongo -p 27017:27017 mongo:7`

## 3. Installation
```bash
cd backend  && npm install
cd ../frontend && npm install
```

## 4. Environment variables (backend/.env, see .env.example)
`npm run setup:env` in `backend/` generates a `.env` with random secrets. Variables: NODE_ENV, PORT, MONGODB_URI,
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, UPLOAD_TOKEN_SECRET (32+ chars each), ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL_DAYS,
BCRYPT_ROUNDS, MAX_FAILED_LOGINS, LOCKOUT_MINUTES, FRONTEND_ORIGIN, TRUST_PROXY, UPLOAD_DIR, MAX_UPLOAD_MB, SEED_PASSWORD.
Frontend: optional `VITE_API_TARGET` (default http://localhost:4000).

## 5. Database setup
```bash
cd backend
npm run setup:env     # once
npm run seed          # wipes and recreates fictional demo agencies, users and cases
```
Collections: users, agencies, cases, evidencemetadatas, refreshsessions, counters, notifications.

## 6. Start the backend
```bash
cd backend && npm run dev        # http://localhost:4000   (production: npm run build && npm start)
```

## 7. Start the frontend
```bash
cd frontend && npm run dev       # http://localhost:5173  (proxies /api to the backend)
```

## 8. Test credentials (fictional)
Password for every demo user: the `SEED_PASSWORD` value in `backend/.env` (printed location by `setup:env`).

| Role | Email |
|---|---|
| ADMIN | admin@childsafe.demo |
| POLICE (Alpha) | police@childsafe.demo |
| POLICE (Beta) | police.beta@childsafe.demo |
| LABOUR | labour@childsafe.demo |
| CWC | cwc@childsafe.demo |
| NGO | ngo@childsafe.demo |
| GOVERNMENT | gov@childsafe.demo |
| CITIZEN | citizen@childsafe.demo |

Demo tracking: Tracking ID `CS-DEMO123`, PIN `123456` (case CL-2026-001245, Street Vending, age 13, Under Verification).

## 9. API
| Method | Path | Access |
|---|---|---|
| POST | /api/auth/register | public (creates CITIZEN only) |
| POST | /api/auth/login | public |
| POST | /api/auth/refresh | refresh cookie |
| POST | /api/auth/logout | refresh cookie |
| GET | /api/auth/me | authenticated |
| POST | /api/cases | public (anonymous allowed) |
| GET | /api/cases | POLICE, LABOUR, CWC, NGO, GOVERNMENT (scoped) |
| GET | /api/cases/:id | same roles (scoped, field-filtered); `:id` = CL-... or Mongo id |
| POST | /api/cases/:id/evidence | `X-Upload-Token` (reporter) or Bearer (in-scope staff / owning citizen) |
| POST | /api/track | public (Tracking ID + PIN) |
| GET | /api/agencies | authenticated non-citizen |
| GET/POST/PATCH | /api/users | ADMIN |
| GET | /api/health | public |


