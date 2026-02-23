#!/bin/bash
# Quick API test script

echo "🧪 Testing TMS API..."
echo ""

# Test loads endpoint
echo "1️⃣ Testing GET /api/loads"
curl -s http://localhost:3001/api/loads | head -c 200
echo ""
echo ""

# Test drivers endpoint
echo "2️⃣ Testing GET /api/drivers"
curl -s http://localhost:3001/api/drivers | head -c 200
echo ""
echo ""

# Test stats endpoint
echo "3️⃣ Testing GET /api/stats"
curl -s http://localhost:3001/api/stats
echo ""
echo ""

echo "✅ API tests complete!"
