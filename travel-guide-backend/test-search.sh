#!/bin/bash

# Test Search API
# Usage: ./test-search.sh

API_URL="https://your-api-url.execute-api.ap-southeast-1.amazonaws.com/Prod"

echo "========================================="
echo "Testing Search API"
echo "========================================="
echo ""

# Test 1: List all articles (no search)
echo "Test 1: List all articles"
curl -s "${API_URL}/articles?limit=5" | jq '.'
echo ""
echo "----------------------------------------"
echo ""

# Test 2: Search with simple query
echo "Test 2: Search 'test'"
curl -s "${API_URL}/search?q=test&limit=5" | jq '.'
echo ""
echo "----------------------------------------"
echo ""

# Test 3: Search Vietnamese
echo "Test 3: Search 'vietnam'"
curl -s "${API_URL}/search?q=vietnam&limit=5" | jq '.'
echo ""
echo "----------------------------------------"
echo ""

# Test 4: Search location
echo "Test 4: Search 'hanoi'"
curl -s "${API_URL}/search?q=hanoi&limit=5" | jq '.'
echo ""
echo "----------------------------------------"
echo ""

# Test 5: Search with encoding
echo "Test 5: Search 'Tường Tiểu hạt' (encoded)"
QUERY=$(echo "Tường Tiểu hạt" | jq -sRr @uri)
curl -s "${API_URL}/search?q=${QUERY}&limit=5" | jq '.'
echo ""
echo "========================================="
