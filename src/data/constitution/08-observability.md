# 📊 Observability Rules

## Every flow must include:

- `traceId`
- `orchestrator`
- `node`
- `action`
- `status`

## Metrics

**Metric:** `giga_api_outcomes_total`

| Field | Values |
|-------|--------|
| `outcome` | `success` / `fail` / `error` |
| `reason` | errorCode or `NA` |
