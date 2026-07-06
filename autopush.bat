@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul
color 0A

echo ========================================================
echo        HE THONG DAY CODE TU DONG LEN GITHUB
echo ========================================================

cd /d "C:\Users\Thuan - IT\Documents\nguyenthuanit"

for /f "tokens=2 delims==" %%i in ('wmic os get LocalDateTime /value') do set dt=%%i
set ngay=!dt:~0,4!-!dt:~4,2!-!dt:~6,2!
set gio=!dt:~8,2!:!dt:~10,2!
set msg=Auto Commit: !ngay! luc !gio!

echo [INFO] Thu muc: %cd%
echo --------------------------------------------------------

echo [1/4] Dang cap nhat code tu GitHub (git pull)...
git pull origin main

echo [2/4] Dang quet cac file thay doi (git add)...
git add .

git diff --cached --quiet
if !errorlevel! equ 0 (
echo [INFO] Khong co thay doi nao moi. Bo qua commit.
goto PUSH_STAGE
)

echo [3/4] Dang tao goi cap nhat: "!msg!"
git commit -m "!msg!"

:PUSH_STAGE
echo [4/4] Dang push code len GitHub...
git push origin main

if !errorlevel! neq 0 (
color 0C
echo --------------------------------------------------------
echo [LOI] Day code that bai! Kiem tra lai mang hoac xung dot.
echo --------------------------------------------------------
) else (
echo --------------------------------------------------------
echo [OK] DA DAY CODE LEN GITHUB THANH CONG!
echo --------------------------------------------------------
)

pause