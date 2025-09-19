#!/bin/bash

# Metro TPHCM Control Service - Docker Demo Validation Script
# This script validates that the Docker environment is ready for demo

echo "=================================================================="
echo "    Metro TPHCM AI Scheduler - Docker Demo Validation"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo -e "\n1️⃣  Checking Docker Compose Status..."
echo "===================================================="

# Check if docker-compose is available
if command -v docker-compose &> /dev/null; then
    print_status 0 "docker-compose command available"
else
    print_status 1 "docker-compose command not found"
    exit 1
fi

# Check control-service status
echo -e "\n📊 Control Service Status:"
CONTROL_STATUS=$(docker-compose ps -q control-service 2>/dev/null)
if [ -n "$CONTROL_STATUS" ]; then
    CONTROL_HEALTH=$(docker-compose ps control-service | grep -o "healthy\|unhealthy\|starting")
    if [ "$CONTROL_HEALTH" = "healthy" ]; then
        print_status 0 "control-service is running and healthy"
    else
        print_status 1 "control-service is running but not healthy (status: $CONTROL_HEALTH)"
        print_warning "Try: docker-compose logs control-service"
    fi
else
    print_status 1 "control-service is not running"
    print_warning "Try: docker-compose up -d control-service"
fi

# Check transport-service status  
echo -e "\n🚄 Transport Service Status:"
TRANSPORT_STATUS=$(docker-compose ps -q transport-service 2>/dev/null)
if [ -n "$TRANSPORT_STATUS" ]; then
    TRANSPORT_HEALTH=$(docker-compose ps transport-service | grep -o "healthy\|unhealthy\|starting")
    if [ "$TRANSPORT_HEALTH" = "healthy" ]; then
        print_status 0 "transport-service is running and healthy"
    else
        print_status 1 "transport-service is running but not healthy (status: $TRANSPORT_HEALTH)"
        print_warning "Try: docker-compose logs transport-service"
    fi
else
    print_status 1 "transport-service is not running"
    print_warning "Try: docker-compose up -d transport-service"
fi

echo -e "\n2️⃣  Testing Demo Environment..."
echo "===================================================="

# Test Python environment
echo -e "\n🐍 Python Environment:"
PYTHON_VERSION=$(docker exec control-service python --version 2>/dev/null)
if [ $? -eq 0 ]; then
    print_status 0 "Python available: $PYTHON_VERSION"
else
    print_status 1 "Cannot access Python in control-service container"
    exit 1
fi

# Test demo dependencies
echo -e "\n📦 Demo Dependencies:"
IMPORT_TEST=$(docker exec control-service python -c "
import sys; sys.path.append('/app/src')
try:
    from ai_scheduler.services.forecast_service import ForecastService
    print('SUCCESS')
except Exception as e:
    print(f'ERROR: {e}')
" 2>/dev/null)

if [[ "$IMPORT_TEST" == *"SUCCESS"* ]]; then
    print_status 0 "ForecastService import successful"
else
    print_status 1 "ForecastService import failed: $IMPORT_TEST"
fi

# Test ForecastService initialization
INIT_TEST=$(docker exec control-service python -c "
import sys; sys.path.append('/app/src')
try:
    from ai_scheduler.services.forecast_service import ForecastService
    fs = ForecastService()
    print('SUCCESS')
except Exception as e:
    print(f'ERROR: {e}')
" 2>/dev/null)

if [[ "$INIT_TEST" == *"SUCCESS"* ]]; then
    print_status 0 "ForecastService initialization successful"
else
    print_status 1 "ForecastService initialization failed: $INIT_TEST"
fi

echo -e "\n3️⃣  Testing Demo Scripts..."
echo "===================================================="

# Test if demo files exist
echo -e "\n📁 Demo Files:"
if docker exec control-service test -f /app/src/ai_scheduler/examples/test_dynamic_demo.py; then
    print_status 0 "test_dynamic_demo.py exists"
else
    print_status 1 "test_dynamic_demo.py not found"
fi

if docker exec control-service test -f /app/src/ai_scheduler/examples/detailed_demand_demo.py; then
    print_status 0 "detailed_demand_demo.py exists"
else
    print_status 1 "detailed_demand_demo.py not found"
fi

# Test quick demo (with timeout)
echo -e "\n⚡ Quick Demo Test:"
DEMO_OUTPUT=$(timeout 30 docker exec control-service python /app/src/ai_scheduler/examples/test_dynamic_demo.py 2>&1)
if [ $? -eq 0 ]; then
    print_status 0 "test_dynamic_demo.py runs successfully"
    echo "   Sample output: $(echo "$DEMO_OUTPUT" | head -2 | tail -1)"
else
    print_status 1 "test_dynamic_demo.py failed or timed out"
    print_warning "This might be normal if demo requires interaction"
fi

echo -e "\n4️⃣  Validation Summary"
echo "===================================================="

# Count successful checks
TOTAL_CHECKS=0
PASSED_CHECKS=0

# This is a simplified check - in real implementation you'd track each test
if [ -n "$CONTROL_STATUS" ] && [ "$CONTROL_HEALTH" = "healthy" ]; then
    ((PASSED_CHECKS++))
fi
((TOTAL_CHECKS++))

if [ -n "$TRANSPORT_STATUS" ] && [ "$TRANSPORT_HEALTH" = "healthy" ]; then
    ((PASSED_CHECKS++))
fi
((TOTAL_CHECKS++))

if [[ "$IMPORT_TEST" == *"SUCCESS"* ]]; then
    ((PASSED_CHECKS++))
fi
((TOTAL_CHECKS++))

if [[ "$INIT_TEST" == *"SUCCESS"* ]]; then
    ((PASSED_CHECKS++))
fi
((TOTAL_CHECKS++))

echo -e "\n📊 Results: $PASSED_CHECKS/$TOTAL_CHECKS checks passed"

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
    echo -e "${GREEN}"
    echo "🎉 SUCCESS! Your Docker environment is ready for the demo!"
    echo ""
    echo "Next steps:"
    echo "1. Run: docker exec -it control-service bash"
    echo "2. cd /app/src/ai_scheduler/examples"
    echo "3. python detailed_demand_demo.py"
    echo -e "${NC}"
else
    echo -e "${RED}"
    echo "❌ Some checks failed. Please fix the issues above before running the demo."
    echo ""
    echo "Common solutions:"
    echo "- docker-compose up -d control-service transport-service"
    echo "- docker-compose logs control-service"
    echo "- Check if all dependencies are installed in Dockerfile"
    echo -e "${NC}"
fi

echo ""
echo "=================================================================="
echo "    Validation Complete"
echo "=================================================================="



