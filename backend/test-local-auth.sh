#!/bin/bash

# Test script for local authentication endpoints
# Make sure the backend server is running before executing this script

API_URL="http://localhost:3001"

echo "Testing Local Authentication..."
echo "================================"
echo

# Test 1: Register a new user
echo "1. Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/auth/local/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "testpassword123"
  }')

echo "Response: ${REGISTER_RESPONSE}"
echo

# Extract token from response (using grep and sed)
TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"accessToken":"[^"]*"' | sed 's/"accessToken":"//; s/"//')

if [ -n "$TOKEN" ]; then
  echo "✓ Registration successful! Token received."
else
  echo "✗ Registration failed!"
fi
echo

# Test 2: Login with the registered user
echo "2. Testing user login..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/local/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }')

echo "Response: ${LOGIN_RESPONSE}"
echo

# Test 3: Get current user with token
if [ -n "$TOKEN" ]; then
  echo "3. Testing get current user (protected route)..."
  ME_RESPONSE=$(curl -s -X GET "${API_URL}/auth/me" \
    -H "Authorization: Bearer ${TOKEN}")
  
  echo "Response: ${ME_RESPONSE}"
  echo
  
  if echo $ME_RESPONSE | grep -q "email"; then
    echo "✓ Protected route access successful!"
  else
    echo "✗ Protected route access failed!"
  fi
else
  echo "3. Skipping protected route test (no token available)"
fi

echo
echo "================================"
echo "Testing complete!"
