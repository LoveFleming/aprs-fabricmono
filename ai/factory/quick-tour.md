# 快速導覽

## 一句話定位

**讓第一次進入 AI Software Factory 的成員，在 5 分鐘內理解這座工廠如何運作。**

---

## 1. AI Software Factory 是什麼

**AI Software Factory** 是一套以規格為核心的軟體生產系統。

它將 API 開發流程標準化，讓需求、規格、程式、測試、文件、Runbook 與觀測資料可以沿著同一條生產線持續產出。

AI Software Factory 的核心概念是：

- **Spec 是單一真實來源**
- **Orchestrator 負責協調流程**
- **Node 封裝明確的業務邏輯**
- **Data Contract 定義穩定的輸入與輸出**
- **AI 依照 Spec 協助產生程式、測試、文件與 Runbook**
- **Reviewer 與 Quality Gate 負責守住品質**

AI Software Factory 的目標不是單純加快寫程式速度，而是建立一套可重複、可檢查、可累積、可治理的軟體交付模式，並在提升交付效率的同時，持續維持高品質的天花板。

---

## 2. 目前工廠能做什麼

AI Software Factory 目前支援以下能力。

---

### 2.1 規格建立

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

---

### 2.2 程式產生

AI 可以依照規格協助產生：

- Controller Code
- Orchestrator Code
- Node Code
- DTO / Contract Model
- Unit Test Draft
- E2E Test Draft
- Runbook Draft
- API Document Draft

---

### 2.3 品質檢查

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

---

### 2.4 工程治理

AI Software Factory 提供一致的工程治理方式：

- 使用 Spec 作為人與 AI 的共同語言
- 使用 Monorepo 管理規格、程式、測試與文件
- 使用 PR Gate 阻擋低品質變更
- 使用 Deterministic Gate 執行可重複的自動檢查
- 使用 Reviewer 檢查規格、程式、測試與風險

---

## 3. 如何開始一條 API 生產線

一條 API 生產線應從業務目的開始，而不是從程式碼開始。

---

### Step 1：定義 API Business Intent

首先定義 API 的業務目的。

需要回答：

```text
這支 API 要解決什麼業務問題？
誰會使用這支 API？
這支 API 要支援什麼查詢、判斷或操作？