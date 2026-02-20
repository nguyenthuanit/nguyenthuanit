@echo off
setlocal enabledelayedexpansion

REM --- Vào thư mục project ---
cd /d "C:\Users\Admin\Documents\Nguyenthuanit" 

REM --- Lấy ngày giờ chuẩn ---
for /f "tokens=2 delims==" %%i in ('wmic os get LocalDateTime /value') do set dt=%%i
set ngay=!dt:~0,4!-!dt:~4,2!-!dt:~6,2!
set gio=!dt:~8,2!-!dt:~10,2!-!dt:~12,2! [cite: 2]

set msg=Auto Commit - !ngay!_!gio!

REM --- Add + Commit ---
git add .

REM --- Kiểm tra xem có gì mới để commit không ---
git diff --cached --quiet
if !errorlevel! equ 0 ( [cite: 3]
    echo Khong co thay doi de commit.
) else (
    git commit -m "!msg!"
)

REM --- Kiểm tra và Push ---
git rev-parse --abbrev-ref --symbolic-full-name @{u} >nul 2>&1
if !errorlevel! neq 0 ( [cite: 4]
    echo Khong co upstream. Dang set origin master...
    git push -u origin master
) else (
    git push
)

pause