@echo off
echo Deploying Firebase Database Rules...

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Firebase CLI is not installed. Please install it first:
    echo npm install -g firebase-tools
    pause
    exit /b 1
)

REM Login to Firebase (if not already logged in)
echo Logging in to Firebase...
firebase login --no-localhost

REM Deploy database rules
echo Deploying database rules...
firebase deploy --only database

echo Database rules deployed successfully!
pause
