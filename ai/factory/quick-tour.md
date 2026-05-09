# 快速導覽

## 一句話定位

**讓第一次進入 AI Software Factory 的成員，在 5 分鐘內理解這座工廠如何運作。**

---

## 1. AI Software Factory 是什麼

**AI Software Factory** 是一套以 **Spec 為核心** 的軟體生產系統。

它將 API 開發流程標準化，讓需求、規格、程式、測試、文件、Runbook 與觀測資料可以沿著同一條生產線持續產出。

核心概念：

- **Spec 是單一真實來源**
- **Orchestrator 負責協調流程**
- **Node 封裝明確的業務邏輯**
- **Data Contract 定義穩定的輸入與輸出**
- **AI 依照 Spec 協助產生程式、測試、文件與 Runbook**
- **Reviewer 與 Quality Gate 負責守住品質**

目標不是單純加快寫程式速度，而是建立一套可重複、可檢查、可累積、可治理的軟體交付模式，並在提升交付效率的同時，持續維持高品質的天花板。

---

## 2. Single Source of Truth

在 AI Software Factory 中，**Spec 是單一真實來源**。

Spec 不是參考文件，而是軟體生產的依據。

所有重要軟體資產都應以 Spec 為基礎進行產生、檢查或審查：

- API Contract
- Orchestrator Flow
- Node Contract
- Code
- Unit Test
- E2E Test
- Runbook
- Observability
- Error Handling
- Review Checklist

核心原則：

```text
Spec 是生產依據。
Spec 是審查依據。
Spec 是測試依據。
Spec 是上線依據。
```

任何會影響 API 行為、Orchestrator 流程、Node 行為、Data Contract、Error Handling、Test Expectation、Runbook 或 Observability 的程式變更，都必須更新對應的 Spec。

如果 Code 與 Spec 不一致，PR 不得通過。

```text
No Spec, No Code.
No Spec Alignment, No Release.
```

---

## 3. 目前工廠能做什麼

AI Software Factory 目前支援以下能力。

### 3.1 規格建立

工廠可以協助建立與維護以下規格資產：

- API Spec
- Orchestrator Spec
- Node Spec
- API Request / Response Contract
- Node Input / Output Contract
- Process Rules
- Error Handling Rules
- Observability Fields
- Runbook Draft

### 3.2 程式產生

AI 可以依照規格協助產生：

- Controller Code
- Orchestrator Code
- Node Code
- DTO / Contract Model
- Unit Test Draft
- E2E Test Draft
- Runbook Draft
- API Document Draft

### 3.3 品質檢查

工廠可以透過規格與檢查機制確認：

- Spec 是否完整
- API Contract 是否穩定
- Node 命名是否具備業務語意
- Node Input / Output 是否清楚
- Error Code 是否符合命名規則
- Unit Test 是否覆蓋主要邏輯
- E2E Test 是否覆蓋關鍵流程
- Runbook 是否可支援值班查案
- Observability 是否足夠定位問題

### 3.4 工程治理

AI Software Factory 提供一致的工程治理方式：

- 使用 Spec 作為人與 AI 的共同語言
- 使用 Monorepo 管理規格、程式、測試與文件
- 使用 PR Gate 阻擋低品質變更
- 使用 Deterministic Gate 執行可重複的自動檢查
- 使用 Reviewer 檢查規格、程式、測試與風險

---

## 4. 如何開始一條 API 生產線

一條 API 生產線應從業務目的開始，而不是從程式碼開始。

### Step 1：定義 API Business Intent

首先定義 API 的業務目的。

需要回答：

```text
這支 API 要解決什麼業務問題？
誰會使用這支 API？
這支 API 要支援什麼查詢、判斷或操作？
```

範例：

```text
API Name:
Lot Tool Material Check

Business Intent:
在執行 MES 操作前，檢查 Lot 是否可以使用指定 Tool 與 Material。
```

### Step 2：建立 API Spec

API Spec 用來描述 API 的外部契約與業務目的。

API Spec 應包含：

- API Name
- Endpoint
- HTTP Method
- Business Purpose
- Request Schema
- Response Schema
- Error Response Schema
- Security Requirement
- Observability Requirement

範例：

```text
POST /api/v1/rw/lot-tool-material-check
```

### Step 3：拆解 Orchestrator Flow

Orchestrator 負責描述 API 的整體流程。

範例：

```text
1. Validate Request
2. Query Lot Information
3. Check Lot Status
4. Check Tool and Material Compatibility
5. Return Check Result
```

設計原則：

```text
Orchestrator 負責協調流程，不承載過多業務細節。
```

業務邏輯應盡量封裝在具備清楚語意的 Node 中。

### Step 4：設計 Business Nodes

Node 是業務能力的封裝單位。

每個 Node 應具備清楚的業務語意、穩定的輸入輸出，以及可測試的規則。

好的 Node 名稱範例：

```text
QueryLotHoldData
ValidateLotHoldRequest
GetLotStatus
CheckLotToolMaterialCompatibility
```

每個 Node 應定義：

- Input Contract
- Output Contract
- Business Rules
- Error Handling
- Observability Fields
- Unit Test Cases

設計重點：

```text
責任清楚。
業務語意清楚。
輸入輸出清楚。
測試情境清楚。
```

### Step 5：產生 Code、Test 與 Runbook

當 Spec 穩定後，AI 可以依照規格協助產生實作內容：

- Controller Code
- Orchestrator Code
- Node Code
- DTO
- Unit Tests
- E2E Test Draft
- Runbook Draft
- API Document

AI 負責加速生產，工程標準與 Reviewer 負責守住品質。

---

## 5. 從 Spec 到 Code 的流程

標準生產流程：

```text
Business Need
 ↓
API Spec
 ↓
Orchestrator Spec
 ↓
Node Specs
 ↓
Data Contracts
 ↓
AI Code Generation
 ↓
Unit Tests / E2E Tests
 ↓
Reviewer Check
 ↓
PR Gate
 ↓
Deployment
 ↓
Monitoring / Runbook Feedback
```

核心原則：

> **Spec 驅動 Code、Test、Runbook 與 Observability。**

Code 不應成為第一個真實來源。Spec 應作為設計、生產、驗證與維運的共同依據。

---

## 6. 常見角色

### 6.1 Spec Engineer

**Spec Engineer** 是規格設計者，負責將業務需求與 Legacy Code 行為轉換成可生產、可驗證、可維護的規格。

主要責任：

- 理解業務目的
- 分析 Legacy Code 行為
- 定義 API Spec
- 定義 Orchestrator Spec
- 定義 Node Spec
- 定義 Input / Output Contract
- 辨識 Business Rules
- 辨識 Error Handling Rules
- 確保規格可被人與 AI 理解

成功標準：

```text
Spec 清楚到工程師或 AI 可以依照它產生正確的程式、測試與文件。
```

### 6.2 Node Developer

**Node Developer** 是依照 Node Spec 實作業務節點的角色。

主要責任：

- 實作 Node Logic
- 遵守 Input / Output Contract
- 正確處理 Business Error
- 優先使用 Framework Utility
- 撰寫 Unit Test
- 保持 Node 責任清楚
- 避免 Node 過大或語意不清

成功標準：

```text
每個 Node 都具備清楚業務語意、穩定 Contract、可靠測試覆蓋。
```

### 6.3 Reviewer

**Reviewer** 是品質守門員，負責確認規格、程式、測試與維運資訊符合工廠標準。

主要責任：

- Review Spec 是否完整
- Review API Contract 是否穩定
- Review Node 名稱是否具備業務語意
- Review Orchestrator Flow 是否清楚
- Review Error Handling 是否符合規則
- Review Unit Test 是否覆蓋關鍵邏輯
- Review E2E Test 是否覆蓋主要流程
- Review Runbook 與 Observability 是否準備完成

成功標準：

```text
不完整的 Spec、不清楚的 Node、缺少測試的變更、風險過高的修改，不能直接進入 Production。
```

---

## 7. 好的 API 生產線應具備什麼

一條成熟的 API 生產線應具備：

- 清楚的 Business Intent
- 穩定的 API Contract
- 清楚的 Orchestrator Flow
- 具備業務語意的 Nodes
- 明確的 Input / Output Contract
- 一致的 Error Code
- Unit Tests
- E2E Tests
- Runbook
- Observability Fields
- PR Review
- Quality Gates

---

## 8. 工廠心法

AI Software Factory 不是單純的 AI Coding Tool。它是一套軟體品質生產系統。

核心心法：

```text
Spec First.
Contract First.
Business Meaning First.
Quality Gate Before Release.
AI Helps Production, Standards Control Quality.
```

```text
規格優先。
契約優先。
業務語意優先。
品質閘門先於上線。
AI 負責加速生產，標準負責守住品質。
```

---

## 9. 總結

AI Software Factory 透過標準化的 API 生產線，讓人與 AI 可以協作產出高品質軟體。

標準流程：

```text
Spec → Orchestrator → Node → Contract → Code → Test → Review → Release → Observe
```

目標不是單純產出更多 API，而是建立一套可以長期累積、持續改善、穩定交付，並持續維持高品質天花板的軟體工廠。
