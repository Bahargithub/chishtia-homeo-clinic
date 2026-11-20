@echo off
chcp 65001 > nul
title Homeopathic Clinic Appointment System
echo ========================================================
echo   হোমিওপ্যাথিক ক্লিনিক অনলাইন শিডিউল ও টেলিগ্রাম সিস্টেম
echo ========================================================
echo.
cd /d "%~dp0"

echo [1/2] সার্ভার চালু হচ্ছে (Starting Server on port 3000)...
start http://localhost:3000

node server.js
pause
