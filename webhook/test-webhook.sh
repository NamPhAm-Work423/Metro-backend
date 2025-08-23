#!/bin/bash

# Test script for webhook service
# Tests PayPal webhook endpoints and functionality

echo "🚀 Testing Webhook Service on port 3003"
echo "========================================="

BASE_URL="http://localhost:3003"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    local headers=$5
    
    echo -e "\n${YELLOW}Testing:${NC} $description"
    echo "Endpoint: $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" $headers "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X $method $headers -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
    fi
    
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ $http_code -eq 200 ] || [ $http_code -eq 201 ]; then
        echo -e "${GREEN}✅ PASS${NC} - HTTP $http_code"
        echo "Response: $body" | jq '.' 2>/dev/null || echo "Response: $body"
    else
        echo -e "${RED}❌ FAIL${NC} - HTTP $http_code"
        echo "Response: $body"
    fi
}

# Test 1: Health check
test_endpoint "GET" "/health" "General health check"

# Test 2: PayPal health check  
test_endpoint "GET" "/paypal/health" "PayPal webhook health check"

# Test 3: Root endpoint
test_endpoint "GET" "/" "Root endpoint"

# Test 4: Metrics endpoint
test_endpoint "GET" "/metrics" "Metrics endpoint"

# Test 5: PayPal webhook statistics
test_endpoint "GET" "/paypal/statistics" "PayPal webhook statistics"

# Test 6: PayPal webhook endpoint (without proper headers - should fail)
paypal_webhook_data='{
    "id": "WH-TEST-12345",
    "event_type": "PAYMENT.CAPTURE.COMPLETED",
    "resource_type": "capture",
    "resource": {
        "id": "CAPTURE-123",
        "amount": {
            "value": "10.00",
            "currency_code": "USD"
        },
        "status": "COMPLETED"
    }
}'

echo -e "\n${YELLOW}Testing:${NC} PayPal webhook endpoint (should fail - missing headers)"
echo "Endpoint: POST /paypal"
response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST -H "Content-Type: application/json" -d "$paypal_webhook_data" "$BASE_URL/paypal")
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')

if [ $http_code -eq 400 ]; then
    echo -e "${GREEN}✅ PASS${NC} - HTTP $http_code (Expected failure)"
    echo "Response: $body" | jq '.' 2>/dev/null || echo "Response: $body"
else
    echo -e "${RED}❌ UNEXPECTED${NC} - HTTP $http_code"
    echo "Response: $body"
fi

# Test 7: PayPal webhook with proper headers (simulated)
paypal_headers='-H "paypal-transmission-id: TEST-12345" -H "paypal-cert-id: TEST-CERT" -H "paypal-auth-algo: SHA256withRSA" -H "paypal-transmission-sig: TEST-SIGNATURE" -H "paypal-transmission-time: 1234567890"'

echo -e "\n${YELLOW}Testing:${NC} PayPal webhook endpoint (with headers)"
echo "Endpoint: POST /paypal"
response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST $paypal_headers -H "Content-Type: application/json" -d "$paypal_webhook_data" "$BASE_URL/paypal")
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')

if [ $http_code -eq 200 ] || [ $http_code -eq 422 ]; then
    echo -e "${GREEN}✅ PASS${NC} - HTTP $http_code"
    echo "Response: $body" | jq '.' 2>/dev/null || echo "Response: $body"
else
    echo -e "${RED}❌ FAIL${NC} - HTTP $http_code"
    echo "Response: $body"
fi

# Test 8: Invalid endpoint
test_endpoint "GET" "/invalid-endpoint" "Invalid endpoint (should return 404)"

echo -e "\n${YELLOW}=========================================${NC}"
echo -e "${GREEN}🎉 Webhook Service Testing Complete!${NC}"
echo -e "\n${YELLOW}Notes:${NC}"
echo "• Make sure webhook service is running on port 3003"
echo "• Make sure MongoDB and Redis are accessible"
echo "• Check logs for detailed error information"
echo "• PayPal webhook signature verification is skipped in development mode"

echo -e "\n${YELLOW}To start the webhook service:${NC}"
echo "docker-compose up webhook-service"
echo -e "\n${YELLOW}To view logs:${NC}"
echo "docker-compose logs -f webhook-service"



