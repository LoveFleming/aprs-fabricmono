# 🚨 Error Code Rules

## Pattern: `{CODE_CLASS}_{AREA}_{FAMILY}_{DETAIL}`

## CODE_CLASS

| Class | Meaning |
|-------|---------|
| `SYS` | System error |
| `BIZ` | Business error |
| `EXT` | External dependency error |

## AREA

| Area | Layer |
|------|-------|
| `CTRL` | Controller |
| `ORCH` | Orchestrator |
| `NODE` | Node |
| `FW` | Framework |

## ErrorType

- `VALIDATION` → HTTP 400
- `UNAUTHENTICATED` → HTTP 401
- `FORBIDDEN` → HTTP 403
- `NOT_FOUND` → HTTP 404
- `BIZ` → HTTP 422
- `DEPENDENCY` → HTTP 502
- `TIMEOUT` → HTTP 504
- `SYSTEM` → HTTP 500

## Rules

- Node throws the most accurate error
- Upper layer must not rewrite error
- ErrorCode must be stable and aggregatable
