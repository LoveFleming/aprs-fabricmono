# 🏗️ Architecture Layering Rules

## Layering: `Controller → Service → Orchestrator → Node → Utility`

| Layer | Responsibility |
|-------|---------------|
| **Controller** | API boundary, validation/auth, response mapping |
| **Service** | Use-case entry, orchestrator invocation |
| **Orchestrator** | Flow control, branch/retry/fallback/compensation |
| **Node** | Business semantic unit, input/output contract, throw accurate errors |
| **Utility** | Reusable technical helpers, no business logic |

## 🚫 Forbidden

- Controller contains business logic
- Service becomes orchestrator
- Orchestrator contains detailed business logic
- Node performs flow control
- Utility contains business semantics

## ⚖️ Rule: Reverse dependency is forbidden.
