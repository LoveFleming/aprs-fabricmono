# Orchestrator Spec v1

## Metadata
- Orchestrator ID: orch-material-lot-tool-material-check
- Orchestrator Name: MaterialLotToolMaterialCheckOrchestrator
- Service Domain: material
- API ID: api-material-lot-tool-material-check
- API Path: `/api/v1/material/lot-tool-material-check`
- Version: 1.0.0
- Status: draft
- Owner: APRS-MATERIAL

## Use Case Summary
這支 orchestrator 負責單一 use case：檢查指定 lot、tool、material 是否符合執行條件，並回傳 PASS 或 REJECT。

## Scope
### In Scope
- validate request
- query lot
- query tool
- check material compatibility
- build final response

### Out of Scope
- actual transaction
- dispatch
- reservation
- consumption

## Contract References
- API Request Schema: `../../api/material/request.schema.json`
- API Response Schema: `../../api/material/response.schema.json`
- Node Schemas:
  - `../../node/material/node-validate-request.input.schema.json`
  - `../../node/material/node-validate-request.output.schema.json`
  - `../../node/material/node-query-lot.input.schema.json`
  - `../../node/material/node-query-lot.output.schema.json`
  - `../../node/material/node-query-tool.input.schema.json`
  - `../../node/material/node-query-tool.output.schema.json`
  - `../../node/material/node-check-material.input.schema.json`
  - `../../node/material/node-check-material.output.schema.json`
  - `../../node/material/node-build-response.input.schema.json`
  - `../../node/material/node-build-response.output.schema.json`

## Preconditions
- lotId must be provided
- toolId must be provided
- materialId must be provided
- caller is authenticated
- upstream MES is reachable

## Assumptions
- MES is the source of truth for lot and tool state
- material rule data is already synchronized
- this API is synchronous

## Flow
### S01 - Validate Request
- Node ID: `node-validate-request`
- Purpose: 驗證 request 結構與必要欄位
- Input:
  - `request <- $.request`
- Output:
  - `validatedRequest -> $.context.validatedRequest`
- On Error:
  - `abort`

### S02 - Query Lot
- Node ID: `node-query-lot`
- Purpose: 查詢 lot 是否存在與其狀態
- Input:
  - `lotId <- $.request.lotId`
- Output:
  - `lotInfo -> $.context.lotInfo`
- On Error:
  - `abort`

### S03 - Query Tool
- Node ID: `node-query-tool`
- Purpose: 查詢 tool 是否存在與是否可用
- Input:
  - `toolId <- $.request.toolId`
- Output:
  - `toolInfo -> $.context.toolInfo`
- On Error:
  - `abort`

### S04 - Check Material
- Node ID: `node-check-material`
- Purpose: 依 lot / tool / material 規則做匹配判斷
- Input:
  - `lotInfo <- $.context.lotInfo`
  - `toolInfo <- $.context.toolInfo`
  - `materialId <- $.request.materialId`
- Output:
  - `materialCheck -> $.context.materialCheck`
- On Error:
  - `abort`

### S05 - Build Response
- Node ID: `node-build-response`
- Purpose: 彙整上下文並產出 API response
- Input:
  - `lotInfo <- $.context.lotInfo`
  - `toolInfo <- $.context.toolInfo`
  - `materialCheck <- $.context.materialCheck`
  - `request <- $.request`
- Output:
  - `response -> $.context.response`
- On Error:
  - `abort`

## Decision Rules
### R01 - Lot Not Found
- When: `$.context.lotInfo.exists == false`
- Then:
  - outcome: `reject`
  - errorCode: `BIZ_NODE_LOT_QUERY_LOT_NOT_FOUND`

### R02 - Lot Status Invalid
- When: `$.context.lotInfo.status != "READY"`
- Then:
  - outcome: `reject`
  - errorCode: `BIZ_NODE_LOT_QUERY_LOT_STATUS_INVALID`

### R03 - Tool Not Found
- When: `$.context.toolInfo.exists == false`
- Then:
  - outcome: `reject`
  - errorCode: `BIZ_NODE_TOOL_QUERY_TOOL_NOT_FOUND`

### R04 - Tool Not Available
- When: `$.context.toolInfo.status != "AVAILABLE"`
- Then:
  - outcome: `reject`
  - errorCode: `BIZ_NODE_TOOL_QUERY_TOOL_NOT_AVAILABLE`

### R05 - Material Mismatch
- When: `$.context.materialCheck.match == false`
- Then:
  - outcome: `reject`
  - errorCode: `BIZ_NODE_LOT_TOOL_MATCH_LOT_TOOL_MISMATCH`

## Error Policy
| ErrorType | Action | HTTP Status |
|---|---|---:|
| VALIDATION | abort | 400 |
| BIZ | return_reject | 409 |
| DEPENDENCY | abort | 502 |
| TIMEOUT | abort | 504 |
| SYSTEM | abort | 500 |

## Response Mapping
- `result <- $.context.materialCheck.finalResult`
- `lotId <- $.request.lotId`
- `toolId <- $.request.toolId`
- `materialId <- $.request.materialId`
- `checks.lotExists <- $.context.lotInfo.exists`
- `checks.lotStatus <- $.context.lotInfo.status`
- `checks.toolExists <- $.context.toolInfo.exists`
- `checks.toolStatus <- $.context.toolInfo.status`
- `checks.materialMatch <- $.context.materialCheck.match`

## Observability
### Metrics
Metric Name: `giga_api_outcomes_total`

Labels:
- `orchestrator = material_lot_tool_material_check`
- `label = ltm_check`
- `outcome = success | reject | error`
- `reason = errorCode | NA`

### Required Log Fields
- traceId
- orchestratorId
- stepId
- nodeId
- errorType
- errorCode
- lotId
- toolId
- materialId

### Events
- `material_ltm_check_success`
- `material_ltm_check_reject`
- `material_ltm_check_error`

## Error Codes
### BIZ
- `BIZ_NODE_LOT_QUERY_LOT_NOT_FOUND`
- `BIZ_NODE_LOT_QUERY_LOT_STATUS_INVALID`
- `BIZ_NODE_TOOL_QUERY_TOOL_NOT_FOUND`
- `BIZ_NODE_TOOL_QUERY_TOOL_NOT_AVAILABLE`
- `BIZ_NODE_LOT_TOOL_MATCH_LOT_TOOL_MISMATCH`

### EXT
- `EXT_NODE_MES_QUERY_TIMEOUT`
- `EXT_NODE_MES_QUERY_BAD_RESPONSE`

### SYS
- `SYS_NODE_RESPONSE_MAP_RESPONSE_MAPPING_ERROR`
- `SYS_ORCH_STATE_STEP_RESULT_MISSING`

## Runbook Hints
- `EXT_NODE_MES_QUERY_TIMEOUT`
  - meaning: MES 查詢逾時
  - first action: 檢查 MES health、network、dependency latency
- `BIZ_NODE_LOT_QUERY_LOT_NOT_FOUND`
  - meaning: 指定 lot 不存在
  - first action: 確認 lotId 與 MES 資料同步
- `BIZ_NODE_TOOL_QUERY_TOOL_NOT_AVAILABLE`
  - meaning: tool 狀態不可執行
  - first action: 檢查 tool current status 與 maintenance state

## Test Targets
### Happy Path
- valid lot + valid tool + matched material => PASS

### Reject Cases
- lot not found
- lot status invalid
- tool not found
- tool unavailable
- material mismatch

### Error Cases
- MES timeout
- MES bad response
- response mapping error

### Contract Validation
- invalid request schema must fail fast
- final response must pass response schema
