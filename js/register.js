import { openDatabase, showModal, setButtonLoading, hashPassword } from './common.js';

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

            const db = await openDatabase();
            const transaction = db.transaction(['credentials'], 'readonly');
            const store = transaction.objectStore('credentials');
            const getRequest = store.get(fullName);

            getRequest.onsuccess = () => {
                if (getRequest.result) {
                    showModal('Tên đăng nhập đã tồn tại.');
                    setButtonLoading(registerBtn, false, originalBtnText);
                } else {
                    addNewUser(db, fullName, password);
                }
            };
            getRequest.onerror = () => { throw new Error('Lỗi khi kiểm tra người dùng.'); }

        } catch (error) {
            showModal(error.message);
            setButtonLoading(registerBtn, false, originalBtnText);
        }
    });

    async function addNewUser(db, username, password) {
        const salt = generateSalt();
        const passwordHash = await hashPassword(password + salt);
        const newUser = { username, passwordHash, salt, status: 'active' };
        
        const addTransaction = db.transaction(['credentials', 'userProfile'], 'readwrite');
        const credentialsStore = addTransaction.objectStore('credentials');
        const profileStore = addTransaction.objectStore('userProfile');
        
        credentialsStore.add(newUser);
        profileStore.add({ username, fullName: username });
        
        addTransaction.oncomplete = () => {
            showModal('Đăng ký thành công!', () => {
                window.location.href = 'login.html';
            });
        };
        addTransaction.onerror = () => {
            showModal('Đã xảy ra lỗi khi đăng ký tài khoản.');
            setButtonLoading(registerBtn, false, originalBtnText);
        }
    }
});