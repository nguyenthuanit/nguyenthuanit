// js/common.js

/**
 * Mở và khởi tạo cơ sở dữ liệu IndexedDB.
 * @returns {Promise<IDBDatabase>} Một promise trả về đối tượng database.
 */
export function openDatabase() {
    return new Promise((resolve, reject) => {
        // Sử dụng phiên bản 2 để đảm bảo tất cả các bảng được tạo/cập nhật
        const request = indexedDB.open('userAuthDB', 2);

        request.onerror = (event) => {
            console.error("Database error:", event.target.errorCode);
            reject('Lỗi khi mở database.');
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // Tạo tất cả các bảng cần thiết cho toàn bộ dự án
            if (!db.objectStoreNames.contains('credentials')) {
                db.createObjectStore('credentials', { keyPath: 'username' });
            }
            if (!db.objectStoreNames.contains('userProfile')) {
                db.createObjectStore('userProfile', { keyPath: 'username' });
            }
            // === PHẦN BỊ THIẾU TRONG FILE CŨ CỦA BẠN ===
            if (!db.objectStoreNames.contains('orders')) {
                const orderStore = db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
                orderStore.createIndex('by_username', 'username', { unique: false });
            }
            if (!db.objectStoreNames.contains('passwordRequests')) {
                const requestStore = db.createObjectStore('passwordRequests', { keyPath: 'id', autoIncrement: true });
                if (!requestStore.indexNames.contains('by_username')) {
                    requestStore.createIndex('by_username', 'username', { unique: false });
                }
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
    });
}

/**
 * Băm mật khẩu sử dụng thuật toán SHA-256.
 * @param {string} password Mật khẩu cần băm.
 * @returns {Promise<string>} Chuỗi hash hex.
 */
export async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hiển thị một modal thông báo tùy chỉnh.
 * @param {string} message Nội dung thông báo.
 * @param {function} [callback] Hàm callback sẽ được gọi sau khi modal đóng.
 */
export function showModal(message, callback) {
    const modal = document.getElementById('customModal');
    if (!modal) {
        alert(message);
        if (callback) callback();
        return;
    }
    const modalMessage = document.getElementById('modalMessage');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    
    modalMessage.textContent = message;
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.querySelector('.modal-box').style.transform = 'scale(1)';
    }, 10);

    const closeHandler = () => {
        modal.style.opacity = '0';
        modal.querySelector('.modal-box').style.transform = 'scale(0.9)';
        setTimeout(() => {
            modal.style.display = 'none';
            if (callback) callback();
        }, 300);
    };
    
    const newBtn = modalCloseBtn.cloneNode(true);
    modalCloseBtn.parentNode.replaceChild(newBtn, modalCloseBtn);
    newBtn.addEventListener('click', closeHandler, { once: true });
}

/**
 * Thiết lập trạng thái loading cho một nút bấm.
 * @param {HTMLButtonElement} button Nút cần thay đổi.
 * @param {boolean} isLoading True nếu đang tải, false nếu hoàn tất.
 * @param {string} originalText Nội dung gốc của nút.
 */
export function setButtonLoading(button, isLoading, originalText) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = `<span class="spinner"></span> Đang xử lý...`;
    } else {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}