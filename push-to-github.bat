@echo off
chcp 65001 > nul
title Push to GitHub for Free Live Hosting
echo ========================================================
echo   চিশতিয়া হোমিও ক্লিনিক - GitHub এ কোড আপলোড টুল
echo ========================================================
echo.
cd /d "%~dp0"

echo GitHub-এ তৈরি করা আপনার রিপোজিটরির লিঙ্কটি এখানে পেস্ট করুন
echo (উদাহরণ: https://github.com/your-username/chishtia-homeo-clinic.git)
echo.
set /p REPO_URL="GitHub Repo URL দিন: "

if "%REPO_URL%"=="" (
    echo [ভুল] কোনো লিঙ্ক প্রদান করা হয়নি!
    pause
    exit /b
)

echo.
echo [১/৩] রিমোট অরিজিন কনফিগার করা হচ্ছে...
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo [২/৩] মেইন ব্রাঞ্চ সেট করা হচ্ছে...
git branch -M main

echo [৩/৩] কোড গিটহাবে পুশ করা হচ্ছে...
git push -u origin main

echo.
echo ========================================================
echo   যদি সফলভাবে পুশ হয়ে থাকে, তবে Render.com এ গিয়ে ডিপ্লয় করুন!
echo ========================================================
pause
