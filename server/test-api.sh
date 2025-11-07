#!/bin/bash

API_URL="http://localhost:3001/api"

echo "🧪 Testing NIST 800-171 Compliance Tracker API"
echo "================================================"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Endpoint..."
curl -s "$API_URL/../health" | jq .
echo ""

# Test 2: API Root
echo "2️⃣  Testing API Root..."
curl -s "$API_URL" | jq .
echo ""

# Test 3: Get All Controls
echo "3️⃣  Testing GET /controls (first 3)..."
curl -s "$API_URL/controls" | jq '.data[0:3]'
echo ""

# Test 4: Get Controls Count
echo "4️⃣  Testing GET /controls (count)..."
curl -s "$API_URL/controls" | jq '.count'
echo ""

# Test 5: Get Compliance Stats
echo "5️⃣  Testing GET /controls/stats..."
curl -s "$API_URL/controls/stats" | jq .
echo ""

# Test 6: Get Control by Control ID (Rev 3 format)
echo "6️⃣  Testing GET /controls/control/03.01.01..."
curl -s "$API_URL/controls/control/03.01.01" | jq '.data | {controlId, title, family, status}'
echo ""

# Test 7: Filter Controls by Family
echo "7️⃣  Testing GET /controls?family=AC..."
curl -s "$API_URL/controls?family=AC" | jq '.count'
echo ""

# Test 8: Filter Controls by Priority
echo "8️⃣  Testing GET /controls?priority=Critical..."
curl -s "$API_URL/controls?priority=Critical" | jq '.count'
echo ""

# Test 9: Search Controls
echo "9️⃣  Testing GET /controls?search=authentication..."
curl -s "$API_URL/controls?search=authentication" | jq '.count'
echo ""

# Test 10: Update Control Status
echo "🔟 Testing PUT /controls/1/status..."
curl -s -X PUT "$API_URL/controls/1/status" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "In Progress",
    "implementationNotes": "Initial configuration started",
    "assignedTo": "Admin User"
  }' | jq .
echo ""

echo "✅ API testing complete!"
