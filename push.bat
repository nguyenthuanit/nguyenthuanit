@echo off
setlocal enabledelayedexpansion

REM --- Vào thư mục project ---
cd /d "C:\Users\Admin-IT\Documents\Nguyenthuanit"

REM --- Lấy ngày giờ chuẩn theo Windows (yyyy-mm-dd_hh-mm-ss) ---
for /f %%i in ('wmic os get LocalDateTime ^| find "."') do set dt=%%i
set ngay=!dt:~0,4!-!dt:~4,2!-!dt:~6,2!
set gio=!dt:~8,2!-!dt:~10,2!-!dt:~12,2!

set msg=Auto Commit - !ngay!_!gio!

REM --- Add + Commit ---
git add .

git diff --cached --quiet
if !errorlevel! equ 0 (
    echo Khong co thay doi de commit.
) else (
    git commit -m "!msg!"
)

REM --- Kiem tra upstream ---
git rev-parse --abbrev-ref --symbolic-full-name @{u} >nul 2>&1
if !errorlevel! neq 0 (
    echo Khong co upstream. Dang set origin/master...
    git push --set-upstream origin master
) else (
    git push
)

pause
