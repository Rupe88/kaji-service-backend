#!/bin/bash

# Production API Testing Script
# Base URL
BASE_URL="https://hr-backend-rlth.onrender.com"

echo "=========================================="
echo "🧪 Testing Service Platform Production API"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test email (change this to your test email)
TEST_EMAIL="test@example.com"
TEST_PASSWORD="Test123!@#"
TEST_NAME="Test User"
TEST_PHONE="1234567890"

echo "📧 Test Email: $TEST_EMAIL"
echo ""

# ==========================================
# 1. REGISTER USER
# ==========================================
echo "=========================================="
echo "1️⃣  Testing User Registration"
echo "=========================================="

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"$TEST_NAME\",
    \"phone\": \"$TEST_PHONE\"
  }")

echo "Response:"
echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"
echo ""

# Extract user ID if registration successful
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.id' 2>/dev/null)

if [ "$USER_ID" != "null" ] && [ -n "$USER_ID" ]; then
  echo -e "${GREEN}✅ Registration successful!${NC}"
  echo "User ID: $USER_ID"
else
  echo -e "${RED}❌ Registration failed or user already exists${NC}"
  echo "Note: If user already exists, you can still test OTP verification and login"
fi

echo ""
echo "=========================================="
echo "2️⃣  Testing OTP Verification"
echo "=========================================="
echo "⚠️  Please check your email for OTP code"
echo ""
read -p "Enter OTP code: " OTP_CODE

VERIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"otp\": \"$OTP_CODE\",
    \"type\": \"EMAIL_VERIFICATION\"
  }")

echo "Response:"
echo "$VERIFY_RESPONSE" | jq '.' 2>/dev/null || echo "$VERIFY_RESPONSE"
echo ""

# Extract tokens if verification successful
ACCESS_TOKEN=$(echo "$VERIFY_RESPONSE" | jq -r '.data.tokens.accessToken' 2>/dev/null)
REFRESH_TOKEN=$(echo "$VERIFY_RESPONSE" | jq -r '.data.tokens.refreshToken' 2>/dev/null)

if [ "$ACCESS_TOKEN" != "null" ] && [ -n "$ACCESS_TOKEN" ]; then
  echo -e "${GREEN}✅ OTP Verification successful!${NC}"
  echo "Access Token: ${ACCESS_TOKEN:0:50}..."
else
  echo -e "${RED}❌ OTP Verification failed${NC}"
fi

echo ""
echo "=========================================="
echo "3️⃣  Testing User Login"
echo "=========================================="

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

echo "Response:"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

# Extract tokens from login
LOGIN_ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.tokens.accessToken' 2>/dev/null)
LOGIN_REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.tokens.refreshToken' 2>/dev/null)

if [ "$LOGIN_ACCESS_TOKEN" != "null" ] && [ -n "$LOGIN_ACCESS_TOKEN" ]; then
  echo -e "${GREEN}✅ Login successful!${NC}"
  echo "Access Token: ${LOGIN_ACCESS_TOKEN:0:50}..."
  echo "Refresh Token: ${LOGIN_REFRESH_TOKEN:0:50}..."
else
  echo -e "${RED}❌ Login failed${NC}"
fi

echo ""
echo "=========================================="
echo "4️⃣  Testing Health Endpoint"
echo "=========================================="

HEALTH_RESPONSE=$(curl -s "$BASE_URL/health")
echo "Response:"
echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
echo ""

# Cleanup
rm -f cookies.txt

echo "=========================================="
echo "✅ Testing Complete!"
echo "=========================================="

