# AI Crew JSON Schema 設計

## 設計原則

1. **Crew = 角色**：一個 AI 員工，有名字、職位、個性
2. **Skill = 技能包**：每個 Skill 自帶提示詞片段 + 相關知識
3. **對話時載入**：勾選的 Skills 提示詞會合併成完整的 system prompt

## JSON Schema

### Crew Member（AI 員工）

```jsonc
{
  // === 基本資料（現有） ===
  "id": "ai.spec",
  "title": "Spec Writer",
  "codename": "SpecScribe",
  "imageUrl": "/crew/spec_scribe.png",
  "engine": "opencode",
  "risk": "safe",
  "description": "將模糊需求轉為技術規格的專家。",

  // === 新增：角色提示詞（核心人格 + 職位描述） ===
  "rolePrompt": "你是半導體工廠的規格撰寫工程師。你的工作是將 PM 或製程工程師的需求，轉化為精確的技術規格文件。你熟悉 API 合約、Flow DSL、以及 JSON Schema。回答時使用繁體中文，規格用英文。",

  // === 新增：技能清單（可勾選） ===
  "skills": [
    {
      "id": "extract-user-stories",
      "name": "需求萃取",
      "description": "從需求文件或 legacy code 中提取 user stories",
      "enabled": true,           // 預設是否勾選
      "prompt": "當收到需求時，請依以下格式萃取 user stories：\n- As a [角色], I want [功能], so that [價值]\n- 驗收條件 (Acceptance Criteria)\n-邊界條件 (Edge Cases)\n- 依賴項 (Dependencies)",
      "knowledge": [             // 相關知識文件/specs
        "specs/material/user-story/",
        "specs/rw/user-story/"
      ]
    },
    {
      "id": "define-api-contracts",
      "name": "API 合約定義",
      "description": "定義 API 與 Data contracts（JSON Schema）",
      "enabled": true,
      "prompt": "定義 API 合約時，請遵守以下規範：\n1. 使用 JSON Schema draft-07\n2. Request/Response 必須包含 example\n3. 錯誤回應使用統一 ErrorEnvelope\n4. 版本號格式：major.minor.patch\n5. API path 遵循 /api/v{version}/{domain}/{resource}",
      "knowledge": [
        "specs-old/api-contracts/"
      ]
    },
    {
      "id": "draft-flow-specs",
      "name": "Flow 規格草擬",
      "description": "使用 DSL 草擬 orchestrator flow",
      "enabled": false,          // 預設不勾選，按需啟用
      "prompt": "草擬 flow spec 時使用以下 DSL 格式：\nBLOCK:execute\n  RUN {nodeId} E:{policy}\nBLOCK:decision\n  IF {condition} THEN {branch}\n每個 node 必須標注 input/output/error handling。",
      "knowledge": [
        "specs/material/orchestrator/"
      ]
    }
  ],

  // === 新增：輸出規範 ===
  "outputs": [
    "spec.md",
    "flow.dsl",
    "contract.json"
  ],

  // === 新增：對話設定 ===
  "chatConfig": {
    "greeting": "嗨！我是 SpecScribe，你的規格撰寫工程師。請告訴我你的需求，我來幫你轉成技術規格。",
    "maxTokens": 4096,
    "temperature": 0.3,
    "model": "default"            // 可覆蓋預設模型
  }
}
```

### 對話時的 Prompt 組裝邏輯

```
最終 System Prompt =
  1. rolePrompt                          （角色核心）
  + 2. enabled skills 的 prompt 串接      （勾選的技能）
  + 3. knowledge 文件內容注入              （相關知識）
  + 4. output format 指示                 （輸出規範）
```

### TypeScript 型別定義

```typescript
export interface CrewSkill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;           // 預設是否勾選
  prompt: string;             // 這個 skill 的提示詞片段
  knowledge?: string[];       // 相關知識文件路徑
}

export interface ChatConfig {
  greeting?: string;          // 開場白
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface CrewMember {
  // 基本資料（既有）
  id: string;
  title: string;
  codename: string;
  imageUrl: string;
  engine: SkillEngine;
  risk: Risk;
  description: string;

  // 新增
  rolePrompt: string;               // 角色人格提示詞
  skills: CrewSkill[];              // 可勾選的技能清單（取代原本的 string[]）
  outputs: string[];
  chatConfig?: ChatConfig;
}

// 建立對話時，組裝完整 system prompt
export function buildSystemPrompt(crew: CrewMember, selectedSkillIds?: string[]): string {
  const parts: string[] = [crew.rolePrompt];

  const skillsToLoad = crew.skills.filter(
    s => selectedSkillIds ? selectedSkillIds.includes(s.id) : s.enabled
  );

  for (const skill of skillsToLoad) {
    parts.push(`\n## Skill: ${skill.name}\n${skill.prompt}`);
  }

  if (crew.outputs.length > 0) {
    parts.push(`\n## 輸出格式\n你的輸出應包含以下文件：${crew.outputs.join(', ')}`);
  }

  return parts.join('\n\n');
}
```

### 畫面互動流程

```
1. 點進 Crew 頁面 → 看到角色卡片
2. 展開角色 → 看到 Skill 清單（每個有 checkbox）
3. 勾選/取消 Skills → 即時預覽組合後的 system prompt
4. 點「開始對話」→ 載入勾選的 Skills + 提示詞 → 進入聊天
```

### 既有的 10 個 Crew 升級範例

以 `01-ai.spec.json` 為例，改寫前 → 後：

**Before（目前）：**
```json
{
  "id": "ai.spec",
  "skills": ["Extract user stories...", "Define API...", "Draft flow specs"],
  ...
}
```

**After（升級）：**
```json
{
  "id": "ai.spec",
  "rolePrompt": "你是半導體工廠的規格撰寫工程師...",
  "skills": [
    { "id": "extract-user-stories", "name": "需求萃取", "enabled": true, "prompt": "..." },
    { "id": "define-api-contracts", "name": "API 合約定義", "enabled": true, "prompt": "..." },
    { "id": "draft-flow-specs", "name": "Flow 規格草擬", "enabled": false, "prompt": "..." }
  ],
  ...
}
```

向後相容：`skills` 從 `string[]` 升級為 `CrewSkill[]`，舊的 string 會被當作 `{ id, name, description, enabled: true, prompt: string }` 來處理。
