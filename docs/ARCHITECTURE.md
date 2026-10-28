# CHILD-SAFE Module 1: architecture notes

## Layers (backend)
routes -> validators (zod) -> middleware (auth, RBAC, rate limit, upload) -> controllers -> services -> models (Mongoose)

## RBAC matrix (Module 1)
| Role | Case list / detail | Fields visible | Evidence upload | Other |
|---|---|---|---|---|
| CITIZEN | none | n/a | own reports (when logged in) | track via Tracking ID + PIN |
| POLICE | assigned + emergency cases in own district | full detail incl. reporter contact, GPS | yes (in scope) | |
| LABOUR | assigned + labour-related categories in own district | no gender/identity flag, no GPS, no reporter contact | yes (in scope) | |
| CWC | assigned + emergency / protection categories / vulnerability flags in own district | full detail incl. reporter contact | yes (in scope) | |
| NGO | assigned only | activity, duration, school status; district + taluk only | yes (in scope) | |
| GOVERNMENT | own district | summary only (no child detail), no detail endpoint data | no | |
| ADMIN | none | n/a | no | manage users, view agencies |

Out-of-scope cases return 404 (not 403) so their existence is not revealed.
Case assignment does not exist yet (Module 2), so `assignedAgencyIds` is only populated by seed data.
ABAC replaces `scopeFor()` in Module 4.

## Extension points (not implemented)
- `EvidenceMetadata.redactionStatus` is always `NOT_PROCESSED` (face detection: Module 3)
- `Notification` model exists, nothing writes or reads it (Module 3)
- `RiskBadge` shows only the reporter's own emergency answer (AI scoring: Module 2)
- `storage.service.ts` driver interface (swap local disk for S3/GCS)
- Ledger (PostgreSQL) hook: `Case.statusHistory` is the future source of ledger events (Module 4)

## Security notes
- Passwords and tracking PINs are bcrypt-hashed (bcryptjs, 12 rounds). PIN is returned once.
- Access token: JWT 15 min, held in memory only. Refresh token: opaque random, SHA-256 hashed in MongoDB, httpOnly + SameSite=Strict cookie, rotated on every use, reuse revokes all sessions.
- Login lockout: 5 failures -> 15 min lock. Tracking lockout: 5 wrong PINs per case -> 15 min lock. Plus per-IP rate limits.
- Uploads: allow-list by magic bytes (client MIME ignored), size/count limits, random server-side names, 0600 permissions, never served statically.
