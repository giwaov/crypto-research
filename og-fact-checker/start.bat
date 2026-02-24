@echo off
REM Start script for AI Fact Checker Web UI (Windows)
REM Starts both API server and web UI

echo ==========================================
echo 🚀 Starting AI Fact Checker
echo ==========================================
echo.

REM Check if .env exists
if not exist .env (
    echo ❌ Error: .env file not found
    echo    Copy .env.example to .env and configure your keys
    exit /b 1
)

REM Check if opengradient is installed
python -c "import opengradient" 2>nul
if errorlevel 1 (
    echo ❌ Error: opengradient not installed
    echo    Run: pip install -r requirements.txt
    exit /b 1
)

echo ✅ Dependencies OK
echo.

echo 📡 Starting API server on port 5000...
start "API Server" python api_server.py

timeout /t 3 /nobreak >nul

echo 🌐 Starting web UI on port 3000...
start "Web UI" python serve_web.py

echo.
echo ==========================================
echo ✅ Fact Checker is running!
echo ==========================================
echo.
echo 🌐 Web UI:  http://localhost:3000
echo 📡 API:     http://localhost:5000
echo.
echo Close both terminal windows to stop servers
echo.
pause
