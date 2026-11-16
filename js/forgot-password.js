import { showModal } from './common.js';

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbyIRv7GM8fCvBPYuqfrutKB12W_DJEU644AMaTs7ERttzBvypWGReVp-KlFTYnhrsaA6A/exec';

/* --- LOGIC CHÍNH --- */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgot-password-form');
    if (!form) return;

    const submitBtn = form.querySelector('.form-btn');
    const originalBtnText = submitBtn ? submitBtn.textContent.trim() : 'Gửi yêu cầu';

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('username').value.trim();

        if (!username) {
            showModal('Vui lòng nhập tên đăng nhập.');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đang gửi...';
        }

        try {
            const response = await fetch(SHEET_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'forgotPassword',
                    username: username
                })
            });

            if (!response.ok) {
                throw new Error('Lỗi kết nối đến máy chủ Google Sheets.');
            }

            const result = await response.json();
            showModal(result.message);

            if (result.success) {
                form.reset();
            }
        } catch (error) {
            showModal('Đã có lỗi xảy ra khi kết nối với cơ sở dữ liệu.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        }
    });
});