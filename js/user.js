const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbyIRv7GM8fCvBPYuqfrutKB12W_DJEU644AMaTs7ERttzBvypWGReVp-KlFTYnhrsaA6A/exec';

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

    // --- UTILITY FUNCTIONS ---
    async function callSheetAPI(payload) {
        const response = await fetch(SHEET_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Lỗi kết nối Google Sheets');
        return await response.json();
    }

    async function hashPassword(password) {
        const data = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function compressImage(file, maxSize = 150, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = reject;
                img.src = event.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
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

    // --- Data Loading ---
    async function loadUserProfile() {
        backBtn.href = (loggedInUser === 'admin') ? 'admin.html' : 'my-account.html';

        if (loggedInUser === 'admin') {
            const securityTab = document.querySelector('.tab-link[data-tab="tab-security"]');
            if (securityTab) securityTab.style.display = 'none';
            const dangerZone = document.querySelector('.danger-zone');
            if (dangerZone) dangerZone.style.display = 'none';
            const uploadBtn = document.querySelector('label[for="avatar-upload"]');
            if (uploadBtn) uploadBtn.style.display = 'none';

            userNameDisplay.textContent = 'Admin';
            userEmailDisplay.textContent = 'admin@quantri.vn';
            avatarImg.src = 'https://i.pravatar.cc/150?u=admin';

            infoForm.fullName.value = 'Admin';
            infoForm.email.value = 'admin@quantri.vn';
            infoForm.fullName.disabled = true;
            infoForm.phone.disabled = true;
            infoForm.address.disabled = true;
            saveInfoBtn.style.display = 'none';
            return;
        }

        try {
            const res = await callSheetAPI({ action: 'getUserData', username: loggedInUser });
            if (!res.success) {
                throw new Error(res.message);
            }
            const profile = res.profile || {};
            const displayName = profile.fullName || loggedInUser;
            const displayEmail = `${loggedInUser}@system.local`;

            userNameDisplay.textContent = displayName;
            userEmailDisplay.textContent = displayEmail;
            avatarImg.src = profile.avatar || `https://i.pravatar.cc/150?u=${loggedInUser}`;

            infoForm.fullName.value = profile.fullName || '';
            infoForm.email.value = displayEmail;
            infoForm.phone.value = profile.phone || '';
            infoForm.address.value = profile.address || '';
        } catch (error) {
            showModal('Không thể tải thông tin hồ sơ: ' + error.message);
        }
    }

    // --- Data Saving ---
    async function saveProfileInfo(e) {
        e.preventDefault();
        if (loggedInUser === 'admin') return;

        const originalBtnText = saveInfoBtn.innerHTML;
        setButtonLoading(saveInfoBtn, true, originalBtnText);

        try {
            const res = await callSheetAPI({
                action: 'updateProfile',
                username: loggedInUser,
                fullName: infoForm.fullName.value.trim(),
                phone: infoForm.phone.value.trim(),
                address: infoForm.address.value.trim()
            });

            if (res.success) {
                showModal('Thông tin đã được cập nhật!');
                userNameDisplay.textContent = infoForm.fullName.value.trim() || loggedInUser;
            } else {
                showModal(res.message || 'Lỗi khi cập nhật thông tin.');
            }
        } catch (error) {
            showModal('Lỗi kết nối: ' + error.message);
        } finally {
            setButtonLoading(saveInfoBtn, false, originalBtnText);
        }
    }

    async function saveAvatar(base64Image) {
        if (loggedInUser === 'admin') return;

        try {
            if (base64Image.length > 49000) {
                showModal('Ảnh sau khi nén vẫn vượt quá dung lượng cho phép của Google Sheets. Vui lòng chọn ảnh khác.');
                return;
            }
            const res = await callSheetAPI({
                action: 'updateProfile',
                username: loggedInUser,
                avatar: base64Image
            });
            if (res.success) {
                showModal('Ảnh đại diện đã được cập nhật.');
            } else {
                showModal('Lỗi khi cập nhật ảnh đại diện.');
            }
        } catch (error) {
            showModal('Lỗi kết nối khi lưu ảnh.');
        }
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

            const verifyRes = await callSheetAPI({
                action: 'changePassword',
                step: 'verify',
                username: loggedInUser
            });

            if (!verifyRes.success || !verifyRes.salt) {
                throw new Error("Lỗi: Không tìm thấy thông tin xác thực.");
            }

            const hashedCurrentPassword = await hashPassword(currentPassword + verifyRes.salt);
            if (verifyRes.passwordHash !== hashedCurrentPassword) {
                throw new Error("Mật khẩu hiện tại không chính xác.");
            }

            const hashedNewPassword = await hashPassword(newPassword + verifyRes.salt);
            const updateRes = await callSheetAPI({
                action: 'changePassword',
                step: 'update',
                username: loggedInUser,
                newPasswordHash: hashedNewPassword
            });

            if (!updateRes.success) throw new Error(updateRes.message);

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
        showConfirmModal('BẠN CÓ CHẮC CHẮN MUỐN XÓA TÀI KHOẢN? Hành động này sẽ xóa vĩnh viễn tất cả dữ liệu.', async (confirmed) => {
            if (confirmed) {
                try {
                    const res = await callSheetAPI({ action: 'deleteAccount', username: loggedInUser });
                    if (res.success) {
                        sessionStorage.removeItem('loggedInUser');
                        showModal('Tài khoản đã được xóa vĩnh viễn.', () => { window.location.href = 'login.html'; });
                    } else {
                        showModal('Đã xảy ra lỗi khi xóa tài khoản.');
                    }
                } catch (error) {
                    showModal('Lỗi kết nối: ' + error.message);
                }
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

    avatarUpload.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                const compressedBase64 = await compressImage(file, 150, 0.7);
                avatarImg.src = compressedBase64;
                await saveAvatar(compressedBase64);
            } catch (err) {
                showModal('Không thể xử lý tệp hình ảnh này.');
            }
        }
    });

    // --- Initial Load ---
    loadUserProfile();

    // === 2FA MODAL ===
    const twoFactorToggle = document.getElementById('2faToggle');
    const twoFactorModal = document.getElementById('2faModal');
    const confirm2faBtn = document.getElementById('confirm2faBtn');
    const cancel2faBtn = document.getElementById('cancel2faBtn');
    const codeInputs = twoFactorModal.querySelectorAll('.code-input');

    function generate2FACode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    const close2faModal = (isSuccess = false) => {
        twoFactorModal.style.display = 'none';
        codeInputs.forEach(input => input.value = '');
        if (!isSuccess) {
            twoFactorToggle.checked = false;
        }
    };

    if (twoFactorToggle) {
        twoFactorToggle.addEventListener('change', function () {
            if (this.checked) {
                const generatedCode = generate2FACode();
                generatedCode.split('').forEach((char, index) => {
                    if (codeInputs[index]) {
                        codeInputs[index].value = char;
                    }
                });
                twoFactorModal.style.display = 'flex';
                codeInputs[5].focus();
            } else {
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

            setTimeout(() => {
                setButtonLoading(confirm2faBtn, false, originalBtnText);
                close2faModal(true);
                showModal('Xác thực hai yếu tố đã được bật thành công!');
            }, 1000);
        });
    }

    if (codeInputs.length > 0) {
        codeInputs.forEach((input, index) => {
            input.addEventListener('input', () => {
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