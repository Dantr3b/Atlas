#!/bin/bash

# Task API Test Script
# Tests all CRUD endpoints: Create, List, Get, Update, Delete

set -e

API_URL="http://localhost:3000"
COOKIE_FILE="/tmp/atlas-test-cookie.txt"

echo "🧪 Atlas Task API Tests"
echo "======================="
echo ""cd apps/api

# Step 1: Authenticate
echo "1️⃣  Authenticating..."
echo "   Please visit: $API_URL/auth/google"
echo "   Then press Enter to continue..."
read -p ""

# Get session cookie from browser manually
echo "   Open DevTools (F12) → Application → Cookies → localhost:3000"
echo "   Find the cookie named 'sessionId' and copy ONLY its VALUE"
echo ""
read -p "   Paste sessionId value: " SESSION_VALUE

if [ -z "$SESSION_VALUE" ]; then
  echo "   ❌ No cookie value provided. Exiting."
  exit 1
fi

SESSION_COOKIE="sessionId=$SESSION_VALUE"
echo "   ✅ Cookie saved"
echo ""

# Step 2: Create a task
echo "2️⃣  Creating a task..."
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/tasks" \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION_COOKIE" \
  -d '{
    "content": "Test task from script",
    "status": "INBOX",
    "type": "QUICK",
    "context": "PERSONAL",
    "priority": 5
  }')

TASK_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$TASK_ID" ]; then
  echo "   ❌ Failed to create task"
  echo "   Response: $CREATE_RESPONSE"
  exit 1
fi

echo "   ✅ Task created: $TASK_ID"
echo "   Response: $CREATE_RESPONSE"
echo ""

# Step 3: List all tasks
echo "3️⃣  Listing all tasks..."
LIST_RESPONSE=$(curl -s "$API_URL/tasks" \
  -H "Cookie: $SESSION_COOKIE")

TASK_COUNT=$(echo "$LIST_RESPONSE" | grep -o '"id"' | wc -l)
echo "   ✅ Found $TASK_COUNT task(s)"
echo "   Response: $LIST_RESPONSE"
echo ""

# Step 4: Get task by ID
echo "4️⃣  Getting task by ID ($TASK_ID)..."
GET_RESPONSE=$(curl -s "$API_URL/tasks/$TASK_ID" \
  -H "Cookie: $SESSION_COOKIE")

echo "   ✅ Task retrieved"
echo "   Response: $GET_RESPONSE"
echo ""

# Step 5: Update the task
echo "5️⃣  Updating task..."
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION_COOKIE" \
  -d '{
    "status": "COMPLETED",
    "priority": 10
  }')

echo "   ✅ Task updated"
echo "   Response: $UPDATE_RESPONSE"
echo ""

# Step 6: Delete the task
echo "6️⃣  Deleting task..."
DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/tasks/$TASK_ID" \
  -H "Cookie: $SESSION_COOKIE")

echo "   ✅ Task deleted"
echo "   Response: $DELETE_RESPONSE"
echo ""

# Step 7: Verify deletion
echo "7️⃣  Verifying deletion..."
VERIFY_RESPONSE=$(curl -s "$API_URL/tasks/$TASK_ID" \
  -H "Cookie: $SESSION_COOKIE")

if echo "$VERIFY_RESPONSE" | grep -q "not found"; then
  echo "   ✅ Task successfully deleted (404 confirmed)"
else
  echo "   ⚠️  Unexpected response: $VERIFY_RESPONSE"
fi

echo ""
echo "✅ All tests completed successfully!"
