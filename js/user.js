document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        alert('Bạn chưa đăng nhập. Đang chuyển hướng...');
        window.location.href = 'login.html';
        return;
    }

    // --- DOM Elements ---
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const avatarUpload = document.getElementById('avatar-upload');
    const avatarImg = document.getElementById('avatar-img');
    const userNameDisplay = document.getElementById('user-name');
    const userEmailDisplay = document.getElementById('user-email');
    const infoForm = document.getElementById('info-form');
    const securityForm = document.getElementById('security-form');
    const saveInfoBtn = document.getElementById('save-info-btn');
    const updatePasswordBtn = document.getElementById('update-password-btn');
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const backBtn = document.getElementById('back-btn');

    let db;
    
    // --- UTILITY FUNCTIONS ---
    async function hashPassword(password) {
        const data = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function showModal(message, onConfirm = null) {
        const modal = document.getElementById('customModal');
        const modalMessage = document.getElementById('modalMessage');
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        modalMessage.textContent = message;
        modal.style.display = 'flex';
        
        const newBtn = modalCloseBtn.cloneNode(true);
        modalCloseBtn.parentNode.replaceChild(newBtn, modalCloseBtn);
        newBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            if (onConfirm && typeof onConfirm === 'function') { onConfirm(); }
        }, { once: true });
    }

    function showConfirmModal(message, onConfirm, isDanger = false) {
        const modal = document.getElementById('confirmModal');
        const messageEl = document.getElementById('confirmMessage');
        const cancelBtn = modal.querySelector('.modal-cancel-btn');
        const confirmBtn = modal.querySelector('.modal-confirm-btn');
        
        messageEl.textContent = message;
        confirmBtn.className = `modal-confirm-btn ${isDanger ? 'danger' : ''}`;
        modal.style.display = 'flex';

        const handleConfirm = () => { modal.style.display = 'none'; onConfirm(true); cleanup(); };
        const handleCancel = () => { modal.style.display = 'none'; onConfirm(false); cleanup(); };
        
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        const cleanup = () => {
            newConfirmBtn.removeEventListener('click', handleConfirm);
            newCancelBtn.removeEventListener('click', handleCancel);
        };

        newConfirmBtn.addEventListener('click', handleConfirm);
        newCancelBtn.addEventListener('click', handleCancel);
    }
    
    function setButtonLoading(button, isLoading, originalText) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = `<span class="spinner"></span> Đang xử lý...`;
        } else {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }

    // --- IndexedDB ---
    function setupDatabase() {
        const request = indexedDB.open('userAuthDB', 2); 
        request.onerror = (event) => console.error("Database error:", event.target.errorCode);
        request.onsuccess = (event) => {
            db = event.target.result;
            loadUserProfile();
        };
    }

    // --- Data Loading ---
    function loadUserProfile() {
        if (!db) return;
        backBtn.href = (loggedInUser === 'admin') ? 'admin.html' : 'my-account.html';
        if (loggedInUser === 'admin') {
            const securityTab = document.querySelector('.tab-link[data-tab="tab-security"]');
            if (securityTab) securityTab.style.display = 'none';
            const dangerZone = document.querySelector('.danger-zone');
            if (dangerZone) dangerZone.style.display = 'none';
        }

        const store = db.transaction('userProfile', 'readonly').objectStore('userProfile');
        const request = store.get(loggedInUser);
        request.onsuccess = () => {
            const profile = request.result || {};
            const displayName = (loggedInUser === 'admin') ? 'Admin' : (profile.fullName || loggedInUser);
            const displayEmail = (loggedInUser === 'admin') ? 'admin@quantri.vn' : `${loggedInUser}@system.local`;

            userNameDisplay.textContent = displayName;
            userEmailDisplay.textContent = displayEmail;
            avatarImg.src = profile.avatar || `https://i.pravatar.cc/150?u=${loggedInUser}`;
            
            infoForm.fullName.value = profile.fullName || (loggedInUser === 'admin' ? 'Admin' : '');
            infoForm.email.value = displayEmail;
            infoForm.phone.value = profile.phone || '';
            infoForm.address.value = profile.address || '';
        };
    }
    
    // --- Data Saving ---
    function saveProfileInfo(e) {
        e.preventDefault();
        const originalBtnText = saveInfoBtn.innerHTML;
        setButtonLoading(saveInfoBtn, true, originalBtnText);
        const transaction = db.transaction('userProfile', 'readwrite');
        const store = transaction.objectStore('userProfile');
        const request = store.get(loggedInUser);
        request.onsuccess = () => {
            const profileData = request.result || { username: loggedInUser };
            profileData.fullName = infoForm.fullName.value.trim();
            profileData.phone = infoForm.phone.value.trim();
            profileData.address = infoForm.address.value.trim();
            store.put(profileData);
        };
        transaction.oncomplete = () => {
            showModal('Thông tin đã được cập nhật!');
            userNameDisplay.textContent = infoForm.fullName.value.trim() || (loggedInUser === 'admin' ? 'Admin' : loggedInUser);
            setButtonLoading(saveInfoBtn, false, originalBtnText);
        };
        transaction.onerror = () => {
            showModal('Lỗi khi cập nhật thông tin.');
            setButtonLoading(saveInfoBtn, false, originalBtnText);
        };
    }

    function saveAvatar(base64Image) {
        const transaction = db.transaction('userProfile', 'readwrite');
        const store = transaction.objectStore('userProfile');
        const request = store.get(loggedInUser);
        request.onsuccess = () => {
            const profileData = request.result || { username: loggedInUser };
            profileData.avatar = base64Image;
            store.put(profileData);
        };
        transaction.oncomplete = () => showModal('Ảnh đại diện đã được cập nhật.');
        transaction.onerror = () => showModal('Lỗi khi cập nhật ảnh đại diện.');
    }

    // --- PROMISIFIED DB ACTIONS FOR PASSWORD CHANGE ---
    function getCredentials(db, username) {
        return new Promise((resolve, reject) => {
            const request = db.transaction(['credentials'], 'readonly').objectStore('credentials').get(username);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(`Lỗi khi lấy thông tin: ${event.target.error}`);
        });
    }

    function updateCredentials(db, credentialData) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['credentials'], 'readwrite');
            transaction.objectStore('credentials').put(credentialData);
            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(`Lỗi khi cập nhật: ${event.target.error}`);
        });
    }

    // --- CHANGE PASSWORD & DELETE ACCOUNT FUNCTIONS ---
    async function changePassword(e) {
        e.preventDefault();
        if (loggedInUser === 'admin') {
            showModal('Không thể thay đổi mật khẩu tài khoản Admin từ giao diện này.');
            return;
        }
        const originalBtnText = updatePasswordBtn.innerHTML;
        setButtonLoading(updatePasswordBtn, true, originalBtnText);
        const currentPassword = securityForm['current-password'].value;
        const newPassword = securityForm['new-password'].value;
        const confirmPassword = securityForm['confirm-password'].value;
        try {
            if (!currentPassword || !newPassword || !confirmPassword) throw new Error("Vui lòng nhập đầy đủ thông tin.");
            if (newPassword.length < 6) throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự.");
            if (newPassword !== confirmPassword) throw new Error("Mật khẩu mới và xác nhận mật khẩu không khớp.");
            const userCredential = await getCredentials(db, loggedInUser);
            if (!userCredential || !userCredential.salt) throw new Error("Lỗi: Không tìm thấy thông tin xác thực.");
            const hashedCurrentPassword = await hashPassword(currentPassword + userCredential.salt);
            if (userCredential.passwordHash !== hashedCurrentPassword) throw new Error("Mật khẩu hiện tại không chính xác.");
            const hashedNewPassword = await hashPassword(newPassword + userCredential.salt);
            userCredential.passwordHash = hashedNewPassword;
            await updateCredentials(db, userCredential);
            showModal('Mật khẩu đã được thay đổi thành công!');
            securityForm.reset();
        } catch (error) {
            showModal(error.message);
        } finally {
            setButtonLoading(updatePasswordBtn, false, originalBtnText);
        }
    }
    
    function deleteAccount() {
        if (loggedInUser === 'admin') {
            showModal('Không thể xóa tài khoản Admin.');
            return;
        }
        showConfirmModal('BẠN CÓ CHẮC CHẮN MUỐN XÓA TÀI KHOẢN? Hành động này sẽ xóa vĩnh viễn tất cả dữ liệu.', (confirmed) => {
            if (confirmed) {
                const storesToClear = ['credentials', 'userProfile'];
                if (db.objectStoreNames.contains('orders')) storesToClear.push('orders');
                const transaction = db.transaction(storesToClear, 'readwrite');
                transaction.objectStore('credentials').delete(loggedInUser);
                transaction.objectStore('userProfile').delete(loggedInUser);
                if (db.objectStoreNames.contains('orders')) {
                    const orderStore = transaction.objectStore('orders');
                    const orderIndex = orderStore.index('by_username');
                    orderIndex.openCursor(loggedInUser).onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor) { cursor.delete(); cursor.continue(); }
                    };
                }
                transaction.oncomplete = () => {
                    sessionStorage.removeItem('loggedInUser');
                    showModal('Tài khoản đã được xóa vĩnh viễn.', () => { window.location.href = 'login.html'; });
                };
                transaction.onerror = () => showModal('Đã xảy ra lỗi khi xóa tài khoản.');
            }
        }, true);
    }

    // --- Event Listeners ---
    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            tabLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(link.dataset.tab).classList.add('active');
        });
    });

    infoForm.addEventListener('submit', saveProfileInfo);
    securityForm.addEventListener('submit', changePassword);
    deleteAccountBtn.addEventListener('click', deleteAccount);

    avatarUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => { 
                avatarImg.src = e.target.result; 
                saveAvatar(e.target.result); 
            };
            reader.readAsDataURL(file);
        }
    });

    // --- Initial Load ---
    setupDatabase();

    // === CẢI TIẾN 2FA: TỰ ĐỘNG HÓA VÀ MÔ PHỎNG XÁC NHẬN ===
    const twoFactorToggle = document.getElementById('2faToggle');
    const twoFactorModal = document.getElementById('2faModal');
    const confirm2faBtn = document.getElementById('confirm2faBtn');
    const cancel2faBtn = document.getElementById('cancel2faBtn');
    const codeInputs = twoFactorModal.querySelectorAll('.code-input');

    // Hàm tạo 6 số ngẫu nhiên
    function generate2FACode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Hàm đóng modal 2FA, giữ nguyên trạng thái bật nếu thành công
    const close2faModal = (isSuccess = false) => {
        twoFactorModal.style.display = 'none';
        codeInputs.forEach(input => input.value = ''); 
        if (!isSuccess) {
            twoFactorToggle.checked = false; 
        }
    };

    if (twoFactorToggle) {
        twoFactorToggle.addEventListener('change', function() {
            if (this.checked) {
                // Tự động tạo và điền 6 số
                const generatedCode = generate2FACode();
                generatedCode.split('').forEach((char, index) => {
                    if (codeInputs[index]) {
                        codeInputs[index].value = char;
                    }
                });

                twoFactorModal.style.display = 'flex';
                codeInputs[5].focus(); // Chuyển con trỏ đến ô cuối cùng
            } else {
                // Xử lý logic khi người dùng tắt 2FA
                showModal('Xác thực hai yếu tố đã được tắt.');
            }
        });
    }

    if (cancel2faBtn) {
        cancel2faBtn.addEventListener('click', () => close2faModal(false));
    }

    if (confirm2faBtn) {
        confirm2faBtn.addEventListener('click', () => {
            const originalBtnText = confirm2faBtn.textContent;
            setButtonLoading(confirm2faBtn, true, originalBtnText);

            // Giả lập một lệnh gọi API mất 1 giây
            setTimeout(() => {
                setButtonLoading(confirm2faBtn, false, originalBtnText);
                close2faModal(true); // Đóng modal nhưng giữ nút gạt ở trạng thái bật
                showModal('Xác thực hai yếu tố đã được bật thành công!');
            }, 1000);
        });
    }

    // Xử lý việc nhập mã và tự động chuyển tiêu điểm (giữ nguyên)
    if (codeInputs.length > 0) {
        codeInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (input.value && index < codeInputs.length - 1) {
                    codeInputs[index + 1].focus();
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && index > 0) {
                    codeInputs[index - 1].focus();
                }
            });
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasteData = (e.clipboardData || window.clipboardData).getData('text');
                if (pasteData.length === 6 && /^[0-9]{6}$/.test(pasteData)) {
                    pasteData.split('').forEach((char, index) => {
                        codeInputs[index].value = char;
                    });
                    codeInputs[5].focus();
                }
            });
        });
    }
});