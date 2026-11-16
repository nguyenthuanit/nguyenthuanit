import { hashPassword, showModal, setButtonLoading } from './common.js';

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbyIRv7GM8fCvBPYuqfrutKB12W_DJEU644AMaTs7ERttzBvypWGReVp-KlFTYnhrsaA6A/exec';

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

            // 1. Kiểm tra tài khoản admin cố định trước
            if (username === 'admin' && password === '999998') {
                sessionStorage.setItem('loggedInUser', 'admin');
                showModal('Đăng nhập admin thành công!', () => {
                    window.location.href = 'admin.html';
                });
                return;
            }

            // 2. Truy vấn thông tin user từ Google Sheets
            const response = await fetch(SHEET_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'login',
                    username: username
                })
            });

            if (!response.ok) {
                throw new Error('Lỗi kết nối đến máy chủ Google Sheets.');
            }

            const result = await response.json();

            if (!result.success) {
                showModal(result.message);
                setButtonLoading(loginBtn, false, originalBtnText);
                return;
            }

            const user = result.user;
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

        } catch (error) {
            showModal(error.message);
            setButtonLoading(loginBtn, false, originalBtnText);
        }
    });
});