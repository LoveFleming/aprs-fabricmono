# 🏭 Hello World AI Node Testing

This is a complete **AI Software Factory** Hello World example, demonstrating the **Spec → Code → Test → Deploy** workflow.

---

## 📁 Files Created

```
├── specs/api-contracts/api-hello-world.json      # Spec: API Contract
├── ai/dashboard/src/nodes/helloWorld.ts           # Code: Node Implementation
├── ai/dashboard/src/nodes/helloWorld.test.ts     # Test: Unit Tests
├── ai/dashboard/server/qwen-code-api.mjs         # Deploy: API Endpoint (updated)
└── ai/dashboard/src/pages/HelloWorldDemo.tsx      # UI: Demo Page
```

---

## 🔄 Factory Workflow

### 1. Spec - API Contract
Location: `specs/api-contracts/api-hello-world.json`

Defines the Input/Output Contract with error codes:
- **Input**: `traceId` (required), `name` (optional), `language` (en/zh/ja/es)
- **Output**: `traceId`, `greeting`, `message`, `timestamp`, `nodeInfo`
- **Errors**: `BIZ_HELLO_WORLD_REQUEST_INVALID`, `SYS_HELLO_WORLD_PROCESSING_FAILED`

### 2. Code - Node Implementation
Location: `ai/dashboard/src/nodes/helloWorld.ts`

The `HelloWorldProcessor` class:
- ✅ Implements Input/Output Contract validation
- ✅ Follows factory error code convention (BIZ_ / SYS_ / EXT_ / ORCH_)
- ✅ Multi-language support (English, Chinese, Japanese, Spanish)
- ✅ Health check endpoint

### 3. Test - Quality Gate
Location: `ai/dashboard/src/nodes/helloWorld.test.ts`

Test coverage includes:
- Input Contract validation (traceId required)
- Output Contract compliance (all required fields)
- Multi-language greetings
- Default value handling
- Health check status

### 4. Deploy - API Endpoint
Location: `ai/dashboard/server/qwen-code-api.mjs`

Added endpoints:
- `POST /api/hello-world` - Main greeting endpoint
- `GET /api/hello-world` - Health check

### 5. UI - Demo Page
Location: `ai/dashboard/src/pages/HelloWorldDemo.tsx`

Interactive demo with:
- Name input
- Language selector (4 languages)
- Response display with full JSON
- Health check button

---

## 🚀 Quick Test

### Test via curl

```bash
# Health check
curl http://localhost:4097/api/hello-world

# Test with default (English)
curl -X POST http://localhost:4097/api/hello-world \
  -H "Content-Type: application/json" \
  -d '{"traceId": "test-001"}'

# Test with name and language
curl -X POST http://localhost:4097/api/hello-world \
  -H "Content-Type: application/json" \
  -d '{"traceId": "test-002", "name": "Alice", "language": "zh"}'
```

### Test via Dashboard

1. Start the dashboard:
   ```bash
   cd ai/dashboard
   npm run dev
   ```

2. Open `http://localhost:5173` (or your Vite port)

3. Navigate to the Hello World demo page

4. Enter your name and select a language

5. Click "Test Node" to see the greeting!

---

## 📋 Contract Details

### Input Contract
| Field | Type | Required | Default |
|-------|------|----------|---------|
| `traceId` | string | ✅ | - |
| `name` | string | ❌ | "World" |
| `language` | enum | ❌ | "en" |

### Output Contract
| Field | Type | Description |
|-------|------|-------------|
| `traceId` | string | Same as input |
| `greeting` | string | Greeting phrase in selected language |
| `message` | string | Full welcome message |
| `language` | string | Selected language code |
| `timestamp` | string | ISO 8601 datetime |
| `nodeInfo` | object | Node metadata (id, version, factory) |

### Error Codes
| Code | HTTP | Type | When |
|------|------|------|------|
| `BIZ_HELLO_WORLD_REQUEST_INVALID` | 400 | VALIDATION | Missing/invalid traceId |
| `SYS_HELLO_WORLD_PROCESSING_FAILED` | 500 | SYSTEM | Server error |

---

## ✅ What This Demonstrates

1. ✨ **Spec-First Development**: API contract defined before implementation
2. 🔒 **Contract Compliance**: Strict Input/Output validation
3. 🌍 **Multi-language Support**: Ready for internationalization
4. 📊 **Observability**: traceId tracking and health checks
5. 🧪 **Test Coverage**: Unit tests following factory standards
6. 🎯 **Error Handling**: Proper error codes following naming convention

---

## 🏭 Factory Standards Applied

- ✅ **Error Code Convention**: `BIZ_` / `SYS_` prefixes
- ✅ **Node Identification**: `nodeId`, `version`, `factory` in responses
- ✅ **Trace ID**: Required for request tracking
- ✅ **ISO Timestamp**: Standard datetime format
- ✅ **Health Endpoint**: For monitoring and load balancers

---

Happy factory testing! 🎉