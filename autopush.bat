@echo off
setlocal enabledelayedexpansion
color 0A

echo ========================================================
echo        AUTO PUSH CODE TO GITHUB - NGUYENTHUANIT
echo ========================================================

:: Tu dong tim thu muc nguyenthuanit trong Documents o C
set "TARGET_DIR="
if exist "%USERPROFILE%\Documents\nguyenthuanit\.git" (
    set "TARGET_DIR=%USERPROFILE%\Documents\nguyenthuanit"
) else if exist "C:\Users\ThuanIT\Documents\nguyenthuanit\.git" (
    set "TARGET_DIR=C:\Users\ThuanIT\Documents\nguyenthuanit"
) else if exist "C:\Users\Thuan - IT\Documents\nguyenthuanit\.git" (
    set "TARGET_DIR=C:\Users\Thuan - IT\Documents\nguyenthuanit"
)

if "!TARGET_DIR!"=="" (
    color 0C
    echo [ERROR] Khong tim thay thu muc nguyenthuanit trong Documents o C!
    pause
    exit /b 1
)

cd /d "!TARGET_DIR!"
echo [INFO] Working Directory: %cd%
echo --------------------------------------------------------

:: Lay thoi gian hien tai lam noi dung commit
for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm'"') do set "NOW=%%i"
set "COMMIT_MSG=Update code: !NOW!"

:: Chuyen sang nhanh master
git checkout -B master

echo [1/4] Dang quet thay doi (git add)...
git add .

echo [2/4] Dang dong goi (git commit)...
git diff --cached --quiet
if !errorlevel! equ 0 (
    echo [INFO] Khong co file nao thay doi.
) else (
    git commit -m "!COMMIT_MSG!"
)

echo [3/4] Dang dong bo tu GitHub (git pull)...
git pull origin master --rebase
if !errorlevel! neq 0 (
    color 0E
    echo [WARNING] Xung dot code khi pull! Hay kiem tra chi tiet phia tren.
    pause
    exit /b 1
)

echo [4/4] Dang day code len GitHub (git push)...
git push -u origin master

if !errorlevel! neq 0 (
    color 0C
    echo --------------------------------------------------------
    echo [ERROR] Day code that bai! Xem thong bao loi o tren.
    echo --------------------------------------------------------
) else (
    echo --------------------------------------------------------
    echo [SUCCESS] DA DAY CODE LEN GITHUB THANH CONG!
    echo --------------------------------------------------------
)

pause