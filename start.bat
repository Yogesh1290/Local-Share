@echo off
title LocalShare — WiFi File Sharing
color 0A
setlocal enabledelayedexpansion

echo.
echo  ============================================
echo   LocalShare ^| Fast WiFi File Sharing
echo  ============================================
echo.

:: ── Step 1: Check / install Node.js ───────────────────────────────────────
where node >nul 2>&1
if %errorlevel% equ 0 goto :node_found

echo  [!] Node.js is not installed. Installing automatically...
echo.

where winget >nul 2>&1
if %errorlevel% equ 0 (
  echo  [*] Using winget to install Node.js LTS...
  echo      ^(A UAC prompt may appear — click YES^)
  echo.
  winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements --silent
  if !errorlevel! equ 0 (
    for /f "tokens=*" %%i in ('where /r "C:\Program Files\nodejs" node.exe 2^>nul') do set "NP=%%~dpi"
    if defined NP set "PATH=!NP!;!PATH!"
    goto :node_found
  )
)

echo  [*] Downloading Node.js installer via PowerShell...
set "INST=%TEMP%\node-installer.msi"
powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/lts/node-v20.19.0-x64.msi' -OutFile '%INST%' -UseBasicParsing"
if not exist "%INST%" (
  echo.
  echo  [ERROR] Could not download Node.js.
  echo  Please install it manually from https://nodejs.org (LTS version)
  echo  then double-click start.bat again.
  echo.
  pause
  start https://nodejs.org
  exit /b 1
)
msiexec /i "%INST%" /passive /norestart
del /q "%INST%" >nul 2>&1

for /f "tokens=*" %%i in ('where /r "C:\Program Files\nodejs" node.exe 2^>nul') do set "NP=%%~dpi"
if defined NP set "PATH=!NP!;!PATH!"
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo  [!] Node.js installed but needs a new terminal.
  echo  Please close this window and double-click start.bat again.
  echo.
  pause
  exit /b 0
)

:node_found
echo  [OK] Node.js found:
node -v
echo.

:: ── Step 2: Install server dependencies ───────────────────────────────────
if not exist "node_modules" (
  echo  [*] Installing server dependencies - first time only...
  call npm install
  if !errorlevel! neq 0 (
    echo  [ERROR] npm install failed. Check your internet connection.
    pause & exit /b 1
  )
  echo  [OK] Server dependencies installed!
  echo.
)

:: ── Step 3: Install client dependencies ───────────────────────────────────
if not exist "client\node_modules" (
  echo  [*] Installing client dependencies - first time only...
  cd client
  call npm install
  cd ..
  if !errorlevel! neq 0 (
    echo  [ERROR] Client npm install failed.
    pause & exit /b 1
  )
  echo  [OK] Client dependencies installed!
  echo.
)

:: ── Step 4: Build the UI if needed ────────────────────────────────────────
if not exist "server\public\index.html" (
  echo  [*] Building UI - first time only, takes ~10 seconds...
  cd client
  call npx vite build
  cd ..
  if !errorlevel! neq 0 (
    echo  [ERROR] UI build failed. Check the client/ folder.
    pause & exit /b 1
  )
  echo  [OK] UI built successfully!
  echo.
)

:: ── Step 5: Start! ────────────────────────────────────────────────────────
echo  ============================================
echo   Starting LocalShare...
echo   Press Ctrl+C to stop
echo  ============================================
echo.

node server/index.js

if %errorlevel% neq 0 (
  echo.
  echo  [ERROR] LocalShare crashed or port 8080 is already in use natively.
  pause
) else (
  echo.
  echo  LocalShare stopped.
  pause
)
