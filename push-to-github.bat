@echo off
title GitHub Push Tool - Chishtia Homeo Clinic
echo ========================================================
echo   Uploading all files to GitHub (buharigithub/chishtia-hc)
echo ========================================================
echo.
cd /d "%~dp0"

echo [1/3] Preparing git repository...
git branch -M main
git remote remove origin >nul 2>&1
git remote add origin https://github.com/buharigithub/chishtia-hc.git

echo [2/3] Adding all files and folders (services, data, public)...
git add -A
git commit -m "Upload complete project with all services and folders" >nul 2>&1

echo [3/3] Pushing to GitHub...
echo Please click 'Sign in with your browser' if GitHub login appears.
echo.
git push -u origin main --force

echo.
echo ========================================================
echo   If upload completed successfully:
echo   Go to Render.com -> 'Manual Deploy' -> 'Deploy latest commit'
echo ========================================================
echo.
pause
