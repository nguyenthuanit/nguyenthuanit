import { openDatabase, hashPassword, showModal, setButtonLoading } from './common.js';

/* --- LOGIC CHÍNH CỦA TRANG ĐĂNG NHẬP --- */
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    const loginBtn = loginForm.querySelector('.form-btn');
    const originalBtnText = loginBtn.textContent.trim();

    const togglePasswordBtn = document.querySelector('.toggle-password');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const passwordInput = document.getElementById('password');
            const icon = togglePasswordBtn.querySelector('i');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.replace('bx-hide', 'bx-show');
            } else {
                passwordInput.type = 'password';
                icon.classList.replace('bx-show', 'bx-hide');
            }
        });
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        setButtonLoading(loginBtn, true, originalBtnText);

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        try {
            if (!username || !password) {
                throw new Error('Vui lòng nhập đầy đủ thông tin.');
            }

            // === PHẦN QUAN TRỌNG ĐÃ BỊ MẤT & ĐƯỢC THÊM LẠI TẠI ĐÂY ===
            // 1. Kiểm tra tài khoản admin cố định trước
            if (username === 'admin' && password === '999998') {
                sessionStorage.setItem('loggedInUser', 'admin');
                showModal('Đăng nhập admin thành công!', () => {
                    window.location.href = 'admin.html';
                });
                // Dừng lại ở đây, không cần kiểm tra DB nữa
                return; 
            }

            // 2. Nếu không phải admin, tiếp tục kiểm tra user thường trong DB
            const db = await openDatabase();
            const transaction = db.transaction(['credentials'], 'readonly');
            const credentialsStore = transaction.objectStore('credentials');
            const getRequest = credentialsStore.get(username);

            getRequest.onsuccess = async () => {
                const user = getRequest.result;

                if (!user) {
                    showModal('Tên đăng nhập hoặc mật khẩu không chính xác.');
                    setButtonLoading(loginBtn, false, originalBtnText);
                    return;
                }

                if (user.status === 'locked') {
                    showModal('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
                    setButtonLoading(loginBtn, false, originalBtnText);
                    return;
                }
                
                const hashedInputPassword = await hashPassword(password + user.salt);

                if (user.passwordHash === hashedInputPassword) {
                    sessionStorage.setItem('loggedInUser', user.username);
                    showModal('Đăng nhập thành công!', () => {
                        window.location.href = 'my-account.html';
                    });
                } else {
                    showModal('Tên đăng nhập hoặc mật khẩu không chính xác.');
                    setButtonLoading(loginBtn, false, originalBtnText);
                }
            };

            getRequest.onerror = () => {
                throw new Error('Lỗi khi truy vấn cơ sở dữ liệu.');
            };

        } catch (error) {
            showModal(error.message);
            setButtonLoading(loginBtn, false, originalBtnText);
        }
    });
});