import { openDatabase, showModal } from './common.js';

/* --- LOGIC CHÍNH --- */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgot-password-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('username').value.trim();

        if (!username) {
            showModal('Vui lòng nhập tên đăng nhập.');
            return;
        }

        try {
            const db = await openDatabase();
            const credTransaction = db.transaction('credentials', 'readonly');
            const userStore = credTransaction.objectStore('credentials');
            const userRequest = userStore.get(username);

            userRequest.onsuccess = () => {
                if (userRequest.result) {
                    // User tồn tại, tạo yêu cầu
                    const reqTransaction = db.transaction('passwordRequests', 'readwrite');
                    const requestStore = reqTransaction.objectStore('passwordRequests');
                    const newRequest = {
                        username: username,
                        timestamp: new Date().getTime(),
                        status: 'pending' // pending, completed
                    };
                    requestStore.add(newRequest);
                    reqTransaction.oncomplete = () => {
                        showModal('Yêu cầu của bạn đã được gửi thành công. Vui lòng chờ quản trị viên xử lý.');
                        form.reset();
                    };
                } else {
                    // User không tồn tại
                    showModal('Tên đăng nhập không tồn tại. Vui lòng kiểm tra lại.');
                }
            };
        } catch (error) {
            showModal('Đã có lỗi xảy ra với cơ sở dữ liệu.');
        }
    });
});