@echo off
echo ==========================================
echo    AVTOMATIK YANGILASH DASTURI (DEPLOY)
echo ==========================================
echo.
echo 1. O'zgarishlar Github'ga saqlanmoqda...
git add -A
git commit -m "fix: deploy skriptiga yangi fayllar qo'shildi"
git push origin master

echo.
echo 2. Serverga ulanib yangilanish yuklanmoqda...
ssh -i server_key.pem ubuntu@43.201.59.31 -o StrictHostKeyChecking=no "rm -rf gilam_repo_temp && git clone https://github.com/Jasurbek414/gilam_umumiy.git gilam_repo_temp && cp gilam_repo_temp/deploy_full.sh ./deploy_full.sh && chmod +x deploy_full.sh && ./deploy_full.sh"

echo.
echo ==========================================
echo       YANGILASH TUGADI! SAYTNI TEKSHIRING
echo ==========================================
pause
