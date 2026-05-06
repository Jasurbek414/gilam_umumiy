@echo off
echo Server xatoliklarini tekshirmoqdamiz (Loglar)...
echo.
ssh -i server_key.pem ubuntu@43.201.59.31 -o StrictHostKeyChecking=no "pm2 logs gilam-backend --lines 50 --nostream"
echo.
pause
