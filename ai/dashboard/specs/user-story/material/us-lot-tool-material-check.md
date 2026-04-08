# User Story Spec v1

## Metadata
- User Story ID: us-material-lot-tool-material-check
- Service Domain: material
- API ID: api-material-lot-tool-material-check
- Orchestrator ID: orch-material-lot-tool-material-check
- Status: draft
- Version: 1.0.0

## Title
Lot Tool Material Check

## Goal
在執行 material 相關作業前，先檢查指定的 lot、tool、material 是否符合條件，避免不合法組合進入後續流程。

## Actor
- Upstream system
- Operator

## Trigger
呼叫 `POST /api/v1/material/lot-tool-material-check`

## Business Value
- 提前阻擋不合法 lot / tool / material 組合
- 降低錯誤作業風險
- 讓 upstream system 在正式交易前先做 deterministic pre-check

## In Scope
- lot existence check
- lot status check
- tool existence and availability check
- material compatibility check
- aggregation of final decision

## Out of Scope
- actual dispatch / start transaction
- equipment reservation
- material consumption
- hold / release transaction

## Main Success Scenario
1. Client 傳入 lotId、toolId、materialId
2. 系統驗證 request 格式
3. 系統查詢 lot 狀態
4. 系統查詢 tool 狀態
5. 系統檢查 material rule
6. 系統彙整結果
7. 回傳 `PASS`

## Reject Scenarios
- lot 不存在
- lot 狀態不允許
- tool 不存在
- tool 狀態不可用
- material 與 lot/tool 規則不匹配

## Error Scenarios
- MES query timeout
- MES query bad response
- response mapping error
- unexpected internal system error

## Success Definition
- API 回傳成功
- response schema 驗證通過
- final result 為 `PASS`
- observability fields 完整
