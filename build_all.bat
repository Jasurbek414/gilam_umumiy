@echo off
echo ==========================================
echo    EXE VA APK YARATISH DASTURI (BUILDER)
echo ==========================================
echo.

echo 1. Desktop dastur (EXE) yig'ilmoqda...
cd "d:\Jasurbek tegilmasin\gilam\gilam-aperator-main"
call npm run dist

echo.
echo 2. Mobil ilova (APK) yig'ilmoqda...
cd "d:\Jasurbek tegilmasin\gilam\mobil flutter"
call flutter build apk --release

echo.
echo ==========================================
echo    BARCHA FAYLLAR TAYYOR BO'LDI! ✅
echo ==========================================
echo EXE Fayl manzili: d:\Jasurbek tegilmasin\gilam\gilam-aperator-main\dist-installer
echo APK Fayl manzili: d:\Jasurbek tegilmasin\gilam\mobil flutter\build\app\outputs\flutter-apk\app-release.apk
echo ==========================================
pause
