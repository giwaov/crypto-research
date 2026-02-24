#!/bin/bash
# Start script for AI Fact Checker Web UI
# Starts both API server and web UI

echo "=========================================="
echo "🚀 Starting AI Fact Checker"
echo "=========================================="
echo

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "   Copy .env.example to .env and configure your keys"
    exit 1
fi

# Check if opengradient is installed
if ! python -c "import opengradient" 2>/dev/null; then
    echo "❌ Error: opengradient not installed"
    echo "   Run: pip install -r requirements.txt"
    exit 1
fi

echo "✅ Dependencies OK"
echo

# Start API server in background
echo "📡 Starting API server on port 5000..."
python api_server.py &
API_PID=$!
echo "   PID: $API_PID"

# Wait a moment for API to start
sleep 3

# Start web server in background
echo "🌐 Starting web UI on port 3000..."
python serve_web.py &
WEB_PID=$!
echo "   PID: $WEB_PID"

echo
echo "=========================================="
echo "✅ Fact Checker is running!"
echo "=========================================="
echo
echo "🌐 Web UI:  http://localhost:3000"
echo "📡 API:     http://localhost:5000"
echo
echo "Press Ctrl+C to stop both servers"
echo

# Wait for user interrupt
trap "echo ''; echo 'Stopping servers...'; kill $API_PID $WEB_PID; exit" INT

# Keep script running
wait
