# Runbook v1 - material / lot-tool-material-check

## Metadata
- Runbook ID: rb-material-lot-tool-material-check
- Service Domain: material
- API ID: api-material-lot-tool-material-check
- Orchestrator ID: orch-material-lot-tool-material-check
- Version: 1.0.0

## Purpose
處理 `material / lot-tool-material-check` API 的 reject / error 狀況，協助值班人員快速定位問題。

## Quick Triage
1. 確認 API path 與 request payload
2. 依 `traceId` 查詢 log
3. 先看 `errorType`
4. 再看 `errorCode`
5. 確認失敗 stepId / nodeId
6. 決定是資料問題、外部依賴問題、還是系統問題

## Log Search Fields
- traceId
- orchestratorId
- stepId
- nodeId
- errorType
- errorCode
- lotId
- toolId
- materialId

## Common Error Handling

### EXT_NODE_MES_QUERY_TIMEOUT
- Meaning: MES 查詢逾時
- Check:
  - MES health
  - network connectivity
  - dependency latency trend
- Action:
  - retry after dependency recovers
  - escalate if repeated

### EXT_NODE_MES_QUERY_BAD_RESPONSE
- Meaning: MES 回傳內容異常
- Check:
  - response payload
  - upstream API version
  - mapping compatibility
- Action:
  - compare with expected contract
  - notify dependency owner if payload changed

### BIZ_NODE_LOT_QUERY_LOT_NOT_FOUND
- Meaning: lot 不存在
- Check:
  - request lotId
  - MES master data
- Action:
  - verify input
  - confirm if lot should already exist

### BIZ_NODE_TOOL_QUERY_TOOL_NOT_AVAILABLE
- Meaning: tool 不可用
- Check:
  - tool current status
  - maintenance state
- Action:
  - use another available tool if business allows

### BIZ_NODE_LOT_TOOL_MATCH_LOT_TOOL_MISMATCH
- Meaning: material 規則不匹配
- Check:
  - lot family / route
  - tool capability
  - material rule configuration
- Action:
  - confirm expected combination with business owner

### SYS_NODE_RESPONSE_MAP_RESPONSE_MAPPING_ERROR
- Meaning: response 組裝或 mapping 發生系統錯誤
- Check:
  - code diff
  - missing context values
  - contract mismatch
- Action:
  - stop rollout if introduced by recent change
  - fix and redeploy

## Escalation Guideline
- Repeated TIMEOUT / DEPENDENCY error: escalate to dependency owner
- New SYSTEM error after deployment: escalate to development owner
- Repeated BIZ reject spike: escalate to business / rule owner

## Recovery Notes
- 這支 API 為 synchronous check API
- 無補償交易
- 若 dependency 不穩，建議先阻擋後續正式交易入口
