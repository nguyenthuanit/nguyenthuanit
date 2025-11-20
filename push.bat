@echo off
REM --- Vào thư mục project ---
cd /d "C:\Users\Admin-IT\Documents\Nguyenthuanit"

REM --- Tạo commit message có ngày giờ ---
for /f "tokens=1-3 delims=/- " %%a in ("%date%") do (
    set ngay=%%a-%%b-%%c
)
for /f "tokens=1-2 delims=:." %%a in ("%time%") do (
    set gio=%%a-%%b
)

set msg=Update index.html - %ngay%_%gio%

REM --- Add + Commit ---
git add .
git commit -m "%msg%"

REM --- Kiểm tra xem branch đã có upstream chưa ---
git rev-parse --abbrev-ref --symbolic-full-name @{u} >nul 2>&1
if %errorlevel% neq 0 (
    echo No upstream branch, setting upstream to origin/master...
    git push --set-upstream origin master
) else (
    git push
)

pause