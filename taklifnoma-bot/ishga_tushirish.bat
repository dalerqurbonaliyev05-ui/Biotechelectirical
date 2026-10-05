@echo off
title TaklifnomaBot
chcp 65001 >nul
cd /d "%~dp0"
if exist ".venv\Scripts\activate.bat" call ".venv\Scripts\activate.bat"
python bot.py
echo.
echo Bot to'xtadi. Oynani yopish uchun istalgan tugmani bosing...
pause >nul
