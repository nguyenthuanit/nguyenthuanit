@echo off
setlocal enabledelayedexpansion

:: --- 1. Chuyển vào thư mục project ---
cd /d "C:\Users\Admin\Documents\Nguyenthuanit"

:: --- 2. Lấy ngày giờ chuẩn theo định dạng YYYY-MM-DD_HH-mm ---
for /f "tokens=2 delims==" %%i in ('wmic os get LocalDateTime /value') do set dt=%%i
set ngay=!dt:~0,4!-!dt:~4,2!-!dt:~6,2!
set gio=!dt:~8,2!-!dt:~10,2!

:: Tạo nội dung ghi chú commit tự động
set msg=Auto Commit - !ngay!_!gio!

echo ========================================
echo Dang tien hanh day code len GitHub...
echo Thoi gian: !ngay! !gio!
echo ========================================

:: --- 3. Thực hiện các lệnh Git ---

:: Thêm tất cả thay đổi vào hàng chờ
git add .

:: Kiểm tra xem có thay đổi nào mới không để tránh commit trống
git diff --cached --quiet
if !errorlevel! equ 0 (
    echo [THONG BAO] Khong co thay doi nao moi de commit.
) else (
    echo [1/2] Dang commit voi noi dung: "!msg!"
    git commit -m "!msg!"
)

:: --- 4. Kiểm tra Upstream và Push ---
:: Đảm bảo đang đẩy lên đúng branch master và link github của bạn
echo [2/2] Dang day code len GitHub (origin master)...

:: Thử đẩy code theo cách thông thường
git push origin master

:: Nếu push thất bại do lỗi reference hoặc xung đột, thông báo cho người dùng
if !errorlevel! neq 0 (
    echo [LOI] Co van de xay ra khi push code. 
    echo Hay kiem tra lai ket noi mang hoac xung dot (conflict).
) else (
    echo ========================================
    echo [THANH CONG] Code da duoc cap nhat len GitHub!
    echo ========================================
)

pause