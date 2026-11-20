@echo off
chcp 65001 > nul
title চিশতিয়া হোমিও ক্লিনিক - GitHub Push Tool
echo ========================================================
echo   🌿 চিশতিয়া হোমিও ক্লিনিক - GitHub-এ সকল ফাইল আপলোড
echo ========================================================
echo.
cd /d "%~dp0"

echo [১/৩] গিট রিপোজিটরি প্রস্তুত করা হচ্ছে...
git branch -M main
git remote remove origin >nul 2>&1
git remote add origin https://github.com/buharigithub/chishtia-hc.git

echo [২/৩] গিটহাবে সকল ফাইল (services, public, data) যুক্ত করা হচ্ছে...
git add .
git commit -m "Complete project files with services, data and public" >nul 2>&1

echo [৩/৩] GitHub-এ কোড পাঠানো হচ্ছে...
echo (যদি কোনো ব্রাউজার উইন্ডো খোলে, তবে 'Sign in with browser' এ ক্লিক করুন)
echo.
git push -u origin main --force

echo.
echo ========================================================
echo   আপলোড সম্পন্ন হয়েছে! 
echo   এখন Render.com পেজে গিয়ে 'Manual Deploy' -> 'Deploy latest commit' দিন
echo   অথবা Render স্বয়ংক্রিয়ভাবে নতুন কোড নিয়ে লাইভ হয়ে যাবে।
echo ========================================================
echo.
pause
