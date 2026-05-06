@echo off
echo API tekshirilmoqda...
curl -s "https://gilam-api.ecos.uz/api/public/companies" > api_test_result.txt
echo API javobi api_test_result.txt fayliga saqlandi.
type api_test_result.txt
echo.
pause
