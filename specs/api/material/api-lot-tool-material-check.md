# API Spec v1

## Metadata
- API ID: api-material-lot-tool-material-check
- Service Domain: material
- Orchestrator ID: orch-material-lot-tool-material-check
- Version: 1.0.0
- Status: draft

## Endpoint
- Method: `POST`
- Path: `/api/v1/material/lot-tool-material-check`

## Purpose
提供單一 use case 的同步檢查 API，根據 lot / tool / material 資料做前置合法性判斷。

## Request Schema
- `./request.schema.json`

## Response Schema
- `./response.schema.json`

## Request Example
```json
{
  "lotId": "LOT123456",
  "toolId": "TOOL_A01",
  "materialId": "MAT9001"
}
```

## Success Response Example
```json
{
  "result": "PASS",
  "lotId": "LOT123456",
  "toolId": "TOOL_A01",
  "materialId": "MAT9001",
  "checks": {
    "lotExists": true,
    "lotStatus": "READY",
    "toolExists": true,
    "toolStatus": "AVAILABLE",
    "materialMatch": true
  }
}
```

## Reject Response Example
```json
{
  "result": "REJECT",
  "error": {
    "errorType": "BIZ",
    "errorCode": "BIZ_NODE_LOT_TOOL_MATCH_LOT_TOOL_MISMATCH",
    "message": "Material does not match lot/tool rule."
  }
}
```

## Error Mapping
| ErrorType | HTTP Status |
|---|---:|
| VALIDATION | 400 |
| BIZ | 409 |
| DEPENDENCY | 502 |
| TIMEOUT | 504 |
| SYSTEM | 500 |

## Notes
- 一個 API 只對應一個 use case
- 一個 API 只對應一個 orchestrator
- response contract 不應由 node 各自決定，必須由 orchestrator 統一組裝
