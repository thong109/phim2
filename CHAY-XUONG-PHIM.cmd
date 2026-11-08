@echo off
cd /d "%~dp0"
echo Mo trinh duyet tai http://localhost:3210
python studio\app.py --port 3210
pause
