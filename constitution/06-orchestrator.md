# 🔄 Orchestrator Rules

> **Orchestrator = Flow Engine**

## Responsibilities:

- Flow control
- Branch decision
- Retry / fallback / compensation
- Context state management

## Must:

- Keep flow readable
- Use node result for decision

## Must not:

- Implement detailed business logic

## Decision types:

| Type | Meaning |
|------|---------|
| `success` | Node completed normally |
| `fail` | Business rule violation |
| `error` | System / dependency error |
