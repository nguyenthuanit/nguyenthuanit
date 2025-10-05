document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENTS ===
    const credentialWindow = document.getElementById('credentialWindow');
    const windowHeader = document.getElementById('windowHeader');
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
    const CORRECT_PASSWORD_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'; // sha256('123456')

    // === DRAG AND DROP LOGIC ===
    dragElement(credentialWindow);

    function dragElement(elmnt) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        if (windowHeader) {
            // if present, the header is where you move the DIV from:
            windowHeader.onmousedown = dragMouseDown;
        } else {
            // otherwise, move the DIV from anywhere inside the DIV:
            elmnt.onmousedown = dragMouseDown;
        }

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // get the mouse cursor position at startup:
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            // call a function whenever the cursor moves:
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // calculate the new cursor position:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // set the element's new position:
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            // stop moving when mouse button is released:
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    // === FORM VALIDATION LOGIC ===
    function validateForm() {
        const isUserNameFilled = userNameInput.value.trim() !== '';
        const isPasswordFilled = passwordInput.value.trim() !== '';

        // Enable OK button only if both user name and password fields are filled
        if (isUserNameFilled && isPasswordFilled) {
            okButton.disabled = false;
        } else {
            okButton.disabled = true;
        }
    }
    inputs.forEach(input => {
        input.addEventListener('input', validateForm);
    });


    // === BUTTONS AND FORM ACTIONS ===
    function resetForm() {
        form.reset();
        statusMessage.textContent = '';
        statusMessage.style.display = 'none';
        validateForm(); // Re-validate to disable the OK button
    }
    
    function closeWindow() {
        // You can add fade-out effects here later if you want
        credentialWindow.style.display = 'none';
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Ensure form is valid before submitting (although button state should prevent this)
        if (okButton.disabled) return;

        const enteredUsername = userNameInput.value.trim();
        const enteredPassword = passwordInput.value;

        // Display "Authenticating..." message
        statusMessage.textContent = 'Authenticating...';
        statusMessage.className = 'info';
        statusMessage.style.display = 'block';
        okButton.disabled = true; // Disable button during auth
        
        // Simulate network delay
        setTimeout(() => {
            const hashedInputPassword = sha256(enteredPassword);
            if (enteredUsername === CORRECT_USERNAME && hashedInputPassword === CORRECT_PASSWORD_HASH) {
                // On success, redirect to another page
                window.location.href = 'test.html';
            } else {
                // On failure, show an error message
                statusMessage.textContent = 'Authentication failed. Incorrect user name or password.';
                statusMessage.className = 'error';
                validateForm(); // Re-enable the button if inputs are still valid
            }
        }, 1500);
    });

    cancelButton.addEventListener('click', resetForm);
    closeBtn.addEventListener('click', closeWindow);

    // Bonus: Close the window with the Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeWindow();
        }
    });

    // Initial validation check on page load
    validateForm();
});