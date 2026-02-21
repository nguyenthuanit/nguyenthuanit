// --- CẤU HÌNH HỆ THỐNG ---
const OFFICE_LAT = 9.297882062370338; 
const OFFICE_LNG = 105.68558983928828; 
const RADIUS = 30; 
const COOLDOWN_MINS = 40; 
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyCJ5dV9T5rDMK_95iPKPATIrbZK05NfxKIQq0kLVWXNqTE3mtCgcdlJFqSXMhdMkiW/exec"; 

let currentUser = localStorage.getItem("saved_user") || "";
let isNear = false;
let watchId = null;
let currentStream = null;

// Khởi tạo
window.onload = () => {
    registerServiceWorker(); // Kích hoạt PWA
    if (currentUser) {
        showMainScreen();
    }
};

// PWA Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('PWA Service Worker Đã Đăng Ký'))
        .catch(err => console.log('Lỗi PWA:', err));
    }
}

// UI Trạng thái Tải
function setGlobalLoading(isLoading, text = "Đang xử lý...") {
    const loader = document.getElementById('global-loading');
    document.getElementById('loading-text').innerText = text;
    if (isLoading) loader.classList.remove('hidden');
    else loader.classList.add('hidden');
}

// Đăng nhập kết nối với Google Sheets
async function login() {
    const rawUser = document.getElementById('username').value.trim().replace(/\s+/g, ' ');
    const pass = document.getElementById('password').value;

    if (!rawUser || !pass) return alert("Vui lòng nhập đầy đủ!");

    setGlobalLoading(true, "Đang xác thực với hệ thống...");

    // Mã hóa mật khẩu sang SHA-256 trước khi gửi đi
    const buf = new TextEncoder().encode(pass);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
    const hashed = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // --- MỚI THÊM: TẠM DỪNG ĐỂ COPY MÃ BĂM ---
    prompt("MÃ BĂM CỦA MẬT KHẨU VỪA NHẬP:\n(Bấm Ctrl+C để copy, sau đó dán vào Cột E trên Google Sheets, rồi bấm OK để tiếp tục hoặc Cancel)", hashed);
    // ------------------------------------------

    // Gọi API lên Google Apps Script
    const payload = {
        action: "login",
        username: rawUser,
        password: hashed // Gửi mã băm lên thay vì mật khẩu gốc
    };

    fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Chuẩn hóa tên viết hoa chữ cái đầu nếu muốn, hoặc dùng tên user nhập
            currentUser = rawUser;
            localStorage.setItem("saved_user", currentUser); 
            showMainScreen();
        } else {
            alert(data.message); // Hiển thị lỗi từ server ("Sai mật khẩu", "Không tìm thấy"...)
        }
    })
    .catch(error => {
        alert("Lỗi kết nối mạng! Vui lòng thử lại.");
        console.error(error);
    })
    .finally(() => {
        setGlobalLoading(false);
    });
}

function handleEnter(e) { if (e.key === 'Enter') login(); }

function togglePassword() {
    const passInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.toggle-password');
    passInput.type = passInput.type === 'password' ? 'text' : 'password';
    toggleIcon.innerText = passInput.type === 'password' ? 'visibility_off' : 'visibility';
}

function showMainScreen() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    document.getElementById('display-name').innerText = currentUser;
    document.getElementById('date-display').innerText = new Date().getDate() + " Tháng " + (new Date().getMonth()+1);
    
    startGPS();
    fetchHistoryFromServer(); // Lấy lịch sử thật từ Server (Mô phỏng)
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Xử lý GPS nâng cao
function startGPS() {
    const status = document.getElementById('status-text');
    const icon = document.getElementById('gps-icon');

    watchId = navigator.geolocation.watchPosition(pos => {
        const dist = getDistance(pos.coords.latitude, pos.coords.longitude, OFFICE_LAT, OFFICE_LNG);
        isNear = dist <= RADIUS;
        document.getElementById('dist-val').innerText = Math.round(dist);
        
        status.innerText = isNear ? "Vị trí hợp lệ" : `Ngoài bán kính (${Math.round(dist)}m)`;
        status.classList.remove('gps-error');
        icon.classList.remove('gps-error-icon');
        icon.innerText = "my_location";
        
        updateButtonUI();
    }, err => {
        status.classList.add('gps-error');
        icon.classList.add('gps-error-icon');
        icon.innerText = "location_off";
        document.getElementById('check-btn').disabled = true;

        if (err.code === 1) status.innerText = "Lỗi: Bị từ chối quyền vị trí!";
        else if (err.code === 2) status.innerText = "Lỗi: Mất tín hiệu GPS!";
        else if (err.code === 3) status.innerText = "Lỗi: Quá thời gian lấy tọa độ!";
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
}

function updateButtonUI() {
    const btn = document.getElementById('check-btn');
    const label = document.getElementById('btn-label');
    const timer = document.getElementById('btn-timer');

    const last = localStorage.getItem('last_time_' + currentUser);
    const now = Date.now();
    const wait = COOLDOWN_MINS * 60 * 1000;

    if (last && (now - last < wait)) {
        const rem = Math.ceil((wait - (now - last)) / 1000);
        label.innerText = "ĐÃ GHI NHẬN";
        timer.innerText = `Chờ: ${Math.floor(rem/60)}:${(rem%60).toString().padStart(2,'0')}`;
        btn.disabled = true;
        setTimeout(updateButtonUI, 1000);
    } else if (isNear) {
        label.innerText = "CHẤM CÔNG";
        timer.innerText = "";
        btn.disabled = false;
    } else {
        label.innerText = "NGOÀI VÙNG";
        btn.disabled = true;
    }
}

// MỞ CAMERA CHỐNG GIAN LẬN
async function openCameraModal() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-stream');
    modal.classList.remove('hidden');

    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        video.srcObject = currentStream;
    } catch (err) {
        alert("Không thể mở camera. Vui lòng cấp quyền camera để chấm công!");
        closeCameraModal();
    }
}

function closeCameraModal() {
    document.getElementById('camera-modal').classList.add('hidden');
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
}

// CHỤP VÀ GỬI LÊN SERVER
function captureAndSubmit() {
    const video = document.getElementById('camera-stream');
    const canvas = document.getElementById('camera-canvas');
    const ctx = canvas.getContext('2d');
    
    // Đặt kích thước ảnh nhỏ lại để gửi nhanh hơn
    canvas.width = 480;
    canvas.height = 640;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Lấy ảnh dạng base64 (chất lượng 0.7 để nén ảnh)
    const base64Image = canvas.toDataURL('image/jpeg', 0.7);
    
    closeCameraModal();
    submitData(base64Image);
}

function submitData(photoBase64) {
    setGlobalLoading(true, "Đang đồng bộ dữ liệu...");

    const payload = {
        name: currentUser,
        action: "checkin",
        photo: photoBase64, // Gửi ảnh đính kèm
        timestamp: Date.now()
    };

    fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    })
    .then(async (response) => {
        let text = await response.text();
        if (text.includes("LỖI")) {
            alert("Hệ thống báo: " + text); 
        } else {
            // Lưu local tạm
            const today = new Date().toLocaleDateString('vi-VN');
            let logs = JSON.parse(localStorage.getItem('logs_' + currentUser + '_' + today) || "[]");
            logs.push(new Date().toLocaleTimeString('vi-VN'));
            localStorage.setItem('logs_' + currentUser + '_' + today, JSON.stringify(logs));
            localStorage.setItem('last_time_' + currentUser, Date.now());
            
            alert("Điểm danh thành công!");
            renderHistory(logs);
        }
    })
    .catch(error => {
        alert("Lỗi mạng! Vui lòng thử lại.");
        console.error(error);
    })
    .finally(() => {
        setGlobalLoading(false);
        updateButtonUI();
    });
}

// --- ĐỒNG BỘ DỮ LIỆU TỪ GOOGLE SHEET VỀ WEB ---
function fetchHistoryFromServer() {
    setGlobalLoading(true, "Đang đồng bộ dữ liệu...");

    const payload = {
        action: "get_status",
        username: currentUser
    };

    fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            renderRealHistory(data.times, data.totalWork);
        } else {
            console.log("Lỗi đồng bộ:", data.message);
        }
    })
    .catch(error => {
        console.error("Lỗi mạng khi đồng bộ:", error);
    })
    .finally(() => {
        setGlobalLoading(false);
    });
}

function renderRealHistory(times, totalWork) {
    const maxTimes = 4;
    let displayTimes = times;
    if (displayTimes > maxTimes) displayTimes = maxTimes; // Giới hạn thanh tiến độ ở 100%

    // Cập nhật thanh tiến độ
    document.getElementById('progress-bar-fill').style.width = (displayTimes / maxTimes * 100) + "%";
    
    const progressText = document.getElementById('progress-text');
    const historyList = document.getElementById('history-list');
    
    // NẾU ĐÃ ĐỦ 1 CÔNG (Hoặc IT sửa thành 1, 1.25...)
    if (totalWork >= 1) {
        progressText.innerText = "HOÀN THÀNH 1 CÔNG!";
        progressText.style.color = "var(--success)"; // Đổi màu chữ xanh lá
        
        // Hiển thị lời chúc thiệp xanh lá + Icon pháo hoa
        historyList.innerHTML = `
            <div style="background: #e6f9f5; border: 1px dashed var(--success); border-radius: 12px; padding: 20px; text-align: center; color: var(--success);">
                <span class="material-icons-round" style="font-size: 3rem; margin-bottom: 10px;">celebration</span>
                <h3 style="margin: 0 0 5px 0;">Tuyệt vời!</h3>
                <p style="margin: 0; font-size: 0.95rem;">Bạn đã hoàn thành xuất sắc ngày làm việc hôm nay. Hãy nghỉ ngơi thật tốt nhé!</p>
            </div>
        `;

        // Khoá nút chấm công lại và đổi chữ trên nút
        const btn = document.getElementById('check-btn');
        if (btn) {
            btn.disabled = true;
            document.getElementById('btn-label').innerText = "ĐÃ ĐỦ CÔNG";
            document.getElementById('btn-timer').innerText = "Hẹn gặp lại ngày mai!";
        }
    } 
    // NẾU CHƯA ĐỦ 1 CÔNG (Ví dụ IT sửa thành 0.75, thì app hiểu là 3 lần)
    else {
        progressText.innerText = `${displayTimes}/4 lần`;
        progressText.style.color = ""; // Đưa về màu mặc định
        
        let html = "";
        if (displayTimes === 0) {
            html = `<div class="history-item" style="justify-content:center; color: #7d8597;">Chưa có dữ liệu chấm công hôm nay.</div>`;
        } else {
            for(let i = 1; i <= displayTimes; i++) {
                html += `<div class="history-item">
                            <span>Lần ${i}</span>
                            <b style="color: var(--success);">Đã ghi nhận trên hệ thống</b>
                         </div>`;
            }
        }
        historyList.innerHTML = html;
    }
}

// --- MENU VÀ ĐĂNG XUẤT ---
function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

function logout() {
    currentUser = "";
    localStorage.removeItem("saved_user"); 
    window.location.reload(); 
}

// --- CHỨC NĂNG ĐỔI MẬT KHẨU ---
function openChangePassModal() {
    toggleMenu(); // Đóng sidebar đi
    document.getElementById('change-pass-modal').classList.remove('hidden');
    // Xóa trắng các ô nhập liệu cũ nếu có
    document.getElementById('old-pass').value = "";
    document.getElementById('new-pass').value = "";
    document.getElementById('confirm-pass').value = "";
}

function closeChangePassModal() {
    document.getElementById('change-pass-modal').classList.add('hidden');
}

// Hàm hỗ trợ băm mật khẩu ra mã SHA-256 (tái sử dụng)
async function hashString(text) {
    const buf = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function submitChangePassword() {
    const oldPass = document.getElementById('old-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const confirmPass = document.getElementById('confirm-pass').value;

    if (!oldPass || !newPass || !confirmPass) {
        return alert("Vui lòng điền đầy đủ thông tin!");
    }

    if (newPass !== confirmPass) {
        return alert("Mật khẩu mới không khớp nhau!");
    }

    if (newPass.length < 6) {
        return alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
    }

    setGlobalLoading(true, "Đang cập nhật mật khẩu...");

    // Mã hóa cả mật khẩu cũ và mật khẩu mới trước khi gửi
    const hashedOld = await hashString(oldPass);
    const hashedNew = await hashString(newPass);

    const payload = {
        action: "change_password",
        username: currentUser, // Tên tài khoản đang đăng nhập
        oldPassword: hashedOld,
        newPassword: hashedNew
    };

    fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert("Đổi mật khẩu thành công! Vui lòng đăng nhập lại bằng mật khẩu mới.");
            closeChangePassModal();
            logout(); // Ép văng ra ngoài bắt đăng nhập lại
        } else {
            alert("Lỗi: " + data.message); // Báo lỗi sai mật khẩu cũ
        }
    })
    .catch(error => {
        alert("Lỗi kết nối mạng! Vui lòng thử lại.");
        console.error(error);
    })
    .finally(() => {
        setGlobalLoading(false);
    });
}