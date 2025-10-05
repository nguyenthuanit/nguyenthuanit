document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENTS ===
    const credentialWindow = document.getElementById('credentialWindow');
    const form = document.getElementById('credentialForm');
    const inputs = form.querySelectorAll('.form-input');
    const userNameInput = document.getElementById('userName');
    const passwordInput = document.getElementById('password');
    const okButton = document.getElementById('okButton');
    const cancelButton = document.getElementById('cancelButton');
    const closeBtn = document.getElementById('closeBtn');
    const statusMessage = document.getElementById('statusMessage');

    // === AUTHENTICATION CONSTANTS ===
    const CORRECT_USERNAME = 'admin';
    const CORRECT_PASSWORD_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';

    // === DRAG AND DROP LOGIC ===
    dragElement(credentialWindow);
    function dragElement(elmnt) { /* ... Giữ nguyên code kéo thả ... */ }

    // === FORM VALIDATION LOGIC ===
    function validateForm() { /* ... Giữ nguyên code kiểm tra form ... */ }
    inputs.forEach(input => { input.addEventListener('input', validateForm); });

    // === BUTTONS AND FORM ACTIONS ===
    function resetForm() {
        form.reset();
        statusMessage.style.display = 'none';
        validateForm();
    }
    
    function closeWindow() {
        credentialWindow.style.display = 'none';
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const enteredUsername = userNameInput.value.trim();
        const enteredPassword = passwordInput.value;
        const hashedInputPassword = sha256(enteredPassword);

        statusMessage.textContent = 'Authenticating...';
        statusMessage.className = 'info';
        okButton.disabled = true;
        
        setTimeout(() => {
            if (enteredUsername === CORRECT_USERNAME && hashedInputPassword === CORRECT_PASSWORD_HASH) {
                window.location.href = 'test.html';
            } else {
                statusMessage.textContent = 'Authentication failed. Incorrect user name or password.';
                statusMessage.className = 'error';
                okButton.disabled = false;
            }
        }, 1500);
    });

    cancelButton.addEventListener('click', resetForm);
    closeBtn.addEventListener('click', closeWindow); // <-- Sửa ở đây

    // Cải tiến: Đóng bằng phím Escape
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeWindow();
        }
    });

    validateForm();
});