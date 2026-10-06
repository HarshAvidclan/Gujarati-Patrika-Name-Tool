@echo off
cd /d "%~dp0"
echo.
echo Patrika Name Generator
echo Open http://localhost:8080
echo From another device on the same Wi-Fi use your computer's LAN IP.
echo.
python -m http.server 8080 --bind 0.0.0.0
pause
