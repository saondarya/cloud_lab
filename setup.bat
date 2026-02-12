@echo off
echo 🚀 Setting up Cloud Lab - Real-Time Collaborative Code Editor
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python first.
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    exit /b 1
)

echo ✅ Python found
echo ✅ Node.js found
echo.

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    exit /b 1
)
echo ✅ Backend dependencies installed
cd ..
echo.

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    exit /b 1
)
echo ✅ Frontend dependencies installed
echo.

echo ✨ Setup complete!
echo.
echo To start the application:
echo.
echo 1. Start backend (Terminal 1):
echo    cd backend ^&^& python app.py
echo.
echo 2. Start frontend (Terminal 2):
echo    npm run dev
echo.
echo 3. Open browser:
echo    http://localhost:5173
echo.
echo 📚 Read README.md for more information
echo 🎬 Read DEMO.md for a quick demo guide
echo.
pause
