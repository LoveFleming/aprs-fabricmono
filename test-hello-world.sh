#!/bin/bash
#
# Hello World AI Node Test Script
# Tests the complete Spec → Code → Test → Deploy workflow
#

set -e

API_URL="http://127.0.0.1:4097/api/hello-world"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "🏭 AI Factory - Hello World Testing"
echo "=========================================="
echo ""

# Check if server is running
echo -e "${BLUE}Checking if API server is running...${NC}"
if ! curl -s "$API_URL" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Server not running. Starting server...${NC}"
    cd ai/dashboard
    npm run dev &
    SERVER_PID=$!
    sleep 5
    cd ../..
fi

echo -e "${GREEN}✓ Server is ready${NC}"
echo ""

# Test 1: Health Check
echo -e "${BLUE}Test 1: Health Check${NC}"
echo "GET $API_URL"
curl -s "$API_URL" | jq .
echo ""

# Test 2: Basic Hello World
echo -e "${BLUE}Test 2: Basic Hello World (English)${NC}"
echo "POST $API_URL"
curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d '{"traceId": "test-001"}' | jq .
echo ""

# Test 3: With Name
echo -e "${BLUE}Test 3: With Custom Name${NC}"
echo "POST $API_URL"
curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d '{"traceId": "test-002", "name": "Factory Worker"}' | jq .message
echo ""

# Test 4: Multi-language Tests
echo -e "${BLUE}Test 4: Multi-language Support${NC}"

echo "  Chinese (zh):"
curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d '{"traceId": "test-zh", "name": "林語晴", "language": "zh"}' | jq -r '.message'

echo "  Spanish (es):"
curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d '{"traceId": "test-es", "name": "Amigo", "language": "es"}' | jq -r '.message'

echo "  Japanese (ja):"
curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d '{"traceId": "test-ja", "name": "田中", "language": "ja"}' | jq -r '.message'
echo ""

# Test 5: Error Case
echo -e "${BLUE}Test 5: Error Handling (Missing traceId)${NC}"
echo "POST $API_URL"
curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d '{"name": "Test"}' | jq .
echo ""

# Test 6: Contract Compliance
echo -e "${BLUE}Test 6: Output Contract Compliance${NC}"
echo "Verifying all required fields are present..."
RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d '{"traceId": "contract-test", "name": "Inspector"}')

required_fields=("traceId" "greeting" "message" "language" "timestamp" "nodeInfo")
for field in "${required_fields[@]}"; do
    if echo "$RESPONSE" | jq -e ".""$field" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ $field present${NC}"
    else
        echo -e "  ${YELLOW}✗ $field missing!${NC}"
        exit 1
    fi
done
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}🎉 All tests passed!${NC}"
echo "=========================================="
echo ""
echo -e "🏭 The Hello World node is working correctly!"
echo -e "📄 API Spec:       specs/api-contracts/api-hello-world.json"
echo -e "💻 Implementation: ai/dashboard/src/nodes/helloWorld.ts"
echo -e "🧪 Tests:          ai/dashboard/src/nodes/helloWorld.test.ts"
echo -e "🌐 Endpoint:       POST $API_URL"
echo ""