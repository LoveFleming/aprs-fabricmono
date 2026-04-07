# Material Lot Tool Material Check Spec Sample

這份 sample 採用你指定的方式：

- `api/`, `orchestrator/`, `runbook/`, `user-story/` 都可以再依 service domain 分層
- 本 sample 以 `material/` 為例
- 只有 `api` 與 `node` data contract 使用 JSON Schema
- 其餘統一使用 Markdown
- 觀測資訊與 error code 已直接放在 orchestrator spec，不另外開 observability/error-code 檔案
