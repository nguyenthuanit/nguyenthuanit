import { showModal, setButtonLoading, hashPassword } from './common.js';

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbyIRv7GM8fCvBPYuqfrutKB12W_DJEU644AMaTs7ERttzBvypWGReVp-KlFTYnhrsaA6A/exec';

/* --- HÀM TIỆN ÍCH CỤ THỂ CHO TRANG NÀY --- */
function generateSalt() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/* --- LOGIC CHÍNH CỦA TRANG ĐĂNG KÝ --- */
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    if (!registerForm) return;

    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    const registerBtn = registerForm.querySelector('.form-btn');
    const originalBtnText = registerBtn.textContent.trim();

    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    togglePasswordButtons.forEach(button => {
        button.addEventListener('click', () => {
            const input = button.previousElementSibling;
            const icon = button.querySelector('i');
            if (input && input.tagName === 'INPUT' && icon) {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.replace('bx-hide', 'bx-show');
                } else {
                    input.type = 'password';
                    icon.classList.replace('bx-show', 'bx-hide');
                }
            }
        });
    });

    const validatePasswords = () => {
        if (confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordError.textContent = 'Mật khẩu và xác nhận mật khẩu không khớp.';
            confirmPasswordError.style.display = 'block';
        } else {
            confirmPasswordError.style.display = 'none';
        }
    };

    passwordInput.addEventListener('input', validatePasswords);
    confirmPasswordInput.addEventListener('input', validatePasswords);

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        setButtonLoading(registerBtn, true, originalBtnText);

        const fullName = document.getElementById('fullName').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        try {
            if (fullName.toLowerCase() === 'admin') {
                throw new Error('Tên đăng nhập "admin" đã được bảo lưu. Vui lòng chọn tên khác.');
            }
            if (!fullName || !password || !confirmPassword) {
                throw new Error('Vui lòng nhập đầy đủ thông tin.');
            }
            if (password.length < 6) {
                throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
            }
            if (password !== confirmPassword) {
                throw new Error('Mật khẩu và xác nhận mật khẩu không khớp.');
            }

            const salt = generateSalt();
            const passwordHash = await hashPassword(password + salt);

            const response = await fetch(SHEET_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'register',
                    username: fullName,
                    fullName: fullName,
                    passwordHash: passwordHash,
                    salt: salt
                })
            });

            if (!response.ok) {
                throw new Error('Lỗi kết nối đến máy chủ Google Sheets (HTTP ' + response.status + ').');
            }

            const rawText = await response.text();
            let result;
            try {
                result = JSON.parse(rawText);
            } catch (parseError) {
                console.error('Phản hồi từ Apps Script không phải JSON:', rawText);
                throw new Error('Máy chủ Google Sheets chưa cấp quyền truy cập "Anyone" hoặc chưa Deploy phiên bản mới.');
            }

            if (result.success) {
                showModal(result.message || 'Đăng ký thành công!', () => {
                    window.location.href = 'login.html';
                });
            } else {
                showModal(result.message || 'Đăng ký thất bại.');
                setButtonLoading(registerBtn, false, originalBtnText);
            }

        } catch (error) {
            showModal(error.message);
            setButtonLoading(registerBtn, false, originalBtnText);
        }
    });
});