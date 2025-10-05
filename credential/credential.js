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
    const fileUploadInput = document.getElementById('fileUploadInput');
    const contextMenu = document.getElementById('contextMenu');
    const deleteFileAction = document.getElementById('deleteFileAction');
    const filePreviewModal = document.getElementById('filePreviewModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const filePreviewContent = document.getElementById('filePreviewContent');
    const modalFileName = document.getElementById('modalFileName');
    const downloadFileLink = document.getElementById('downloadFileLink');

    // === AUTHENTICATION CONSTANTS ===
    const CORRECT_USERNAME = 'admin';
    const CORRECT_PASSWORD_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'; // sha256('123456')

    // === LOGIC CHO INDEXEDDB ===
    const DB_NAME = 'fileExplorerDB';
    const STORE_NAME = 'files';
    let db;
    let currentRightClickedFolder = null;

    function initDB() {
        const request = indexedDB.open(DB_NAME, 2);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (db.objectStoreNames.contains(STORE_NAME)) {
                db.deleteObjectStore(STORE_NAME);
            }
            db.createObjectStore(STORE_NAME, { keyPath: 'folderName' });
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Database initialized successfully.');
            checkAndApplyFileState();
        };

        request.onerror = (event) => {
            console.error('Database error:', event.target.errorCode);
        };
    }

    function saveFileToDB(folderName, fileObject, folderElement) {
        if (!db) return;
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({ folderName: folderName, file: fileObject });
        request.onsuccess = () => {
            folderElement.classList.add('has-file');
            alert(`Đã lưu file "${fileObject.name}" vào thư mục "${folderName}"!`);
        };
        request.onerror = (event) => console.error('Error saving file:', event.target.error);
    }

    function getFileFromDB(folderName, callback) {
        if (!db) return;
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(folderName);
        request.onsuccess = () => callback(request.result);
        request.onerror = (event) => console.error('Error getting file:', event.target.error);
    }

    function deleteFileFromDB(folderName, callback) {
        if (!db) return;
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(folderName);
        request.onsuccess = () => callback();
        request.onerror = (event) => console.error('Error deleting file:', event.target.error);
    }

    function checkAndApplyFileState() {
        if (!db) return;
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
            const files = request.result;
            files.forEach(fileRecord => {
                const folderElement = document.querySelector(`.folder-item[data-folder-name="${fileRecord.folderName}"]`);
                if (folderElement) folderElement.classList.add('has-file');
            });
        };
    }

    // === MODAL LOGIC ===
    function showPreviewModal(file) {
        if (!file) return;
        filePreviewContent.innerHTML = '';
        modalFileName.textContent = file.name;

        const fileURL = URL.createObjectURL(file);
        downloadFileLink.href = fileURL;
        downloadFileLink.download = file.name;

        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = fileURL;
            filePreviewContent.appendChild(img);
        } else if (file.type.startsWith('text/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const pre = document.createElement('pre');
                pre.textContent = e.target.result;
                filePreviewContent.appendChild(pre);
            };
            reader.readAsText(file);
        } else {
            filePreviewContent.textContent = `Không thể xem trước file '${file.name}'. Bạn có thể tải về.`;
        }
        
        filePreviewModal.style.display = 'flex';
    }

    function hidePreviewModal() {
        if (downloadFileLink.href) {
            URL.revokeObjectURL(downloadFileLink.href);
        }
        filePreviewModal.style.display = 'none';
        filePreviewContent.innerHTML = '';
    }

    modalCloseBtn.addEventListener('click', hidePreviewModal);
    filePreviewModal.addEventListener('click', (e) => {
        if (e.target === filePreviewModal) {
            hidePreviewModal();
        }
    });

    // === DRAG AND DROP LOGIC ===
    dragElement(credentialWindow);
    function dragElement(elmnt) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        if (windowHeader) { windowHeader.onmousedown = dragMouseDown; } else { elmnt.onmousedown = dragMouseDown; }
        function dragMouseDown(e) { e = e || window.event; e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY; document.onmouseup = closeDragElement; document.onmousemove = elementDrag; }
        function elementDrag(e) { e = e || window.event; e.preventDefault(); pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY; pos3 = e.clientX; pos4 = e.clientY; elmnt.style.top = (elmnt.offsetTop - pos2) + "px"; elmnt.style.left = (elmnt.offsetLeft - pos1) + "px"; }
        function closeDragElement() { document.onmouseup = null; document.onmousemove = null; }
    }

    // === FORM VALIDATION LOGIC ===
    function validateForm() {
        const isUserNameFilled = userNameInput.value.trim() !== '';
        const isPasswordFilled = passwordInput.value.trim() !== '';
        okButton.disabled = !(isUserNameFilled && isPasswordFilled);
    }
    inputs.forEach(input => input.addEventListener('input', validateForm));

    // === BUTTONS AND FORM ACTIONS ===
    function resetForm() { form.reset(); statusMessage.textContent = ''; statusMessage.style.display = 'none'; validateForm(); }
    function closeWindow() { credentialWindow.style.display = 'none'; }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (okButton.disabled) return;
        const enteredUsername = userNameInput.value.trim();
        const enteredPassword = passwordInput.value;
        statusMessage.textContent = 'Authenticating...';
        statusMessage.className = 'info';
        statusMessage.style.display = 'block';
        okButton.disabled = true;
        setTimeout(() => {
            const hashedInputPassword = sha256(enteredPassword);
            if (enteredUsername === CORRECT_USERNAME && hashedInputPassword === CORRECT_PASSWORD_HASH) {
                const fileExplorerView = document.getElementById('fileExplorerView');
                credentialWindow.style.display = 'none';
                fileExplorerView.style.display = 'flex';
            } else {
                statusMessage.textContent = 'Authentication failed. Incorrect user name or password.';
                statusMessage.className = 'error';
                validateForm();
            }
        }, 1500);
    });

    cancelButton.addEventListener('click', resetForm);
    closeBtn.addEventListener('click', closeWindow);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeWindow(); });
    validateForm();

    // === LOGIC TƯƠNG TÁC CHO FILE EXPLORER ===
    const folderItems = document.querySelectorAll('.folder-item');
    let currentFolderElement = null;

    folderItems.forEach(item => {
        item.addEventListener('click', () => {
            folderItems.forEach(otherItem => otherItem.classList.remove('selected'));
            item.classList.add('selected');
            const folderName = item.dataset.folderName;

            if (item.classList.contains('has-file')) {
                getFileFromDB(folderName, (fileRecord) => {
                    if (fileRecord && fileRecord.file) {
                        showPreviewModal(fileRecord.file);
                    }
                });
            } else {
                currentFolderElement = item;
                fileUploadInput.click();
            }
        });

        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (item.classList.contains('has-file')) {
                currentRightClickedFolder = item;
                contextMenu.style.top = `${e.clientY}px`;
                contextMenu.style.left = `${e.clientX}px`;
                contextMenu.style.display = 'block';
            }
        });
    });

    window.addEventListener('click', () => {
        if (contextMenu.style.display === 'block') {
            contextMenu.style.display = 'none';
        }
    });

    deleteFileAction.addEventListener('click', () => {
        if (currentRightClickedFolder) {
            const folderName = currentRightClickedFolder.dataset.folderName;
            deleteFileFromDB(folderName, () => {
                currentRightClickedFolder.classList.remove('has-file');
                alert(`Đã xóa file khỏi thư mục "${folderName}".`);
            });
        }
    });

    fileUploadInput.addEventListener('change', (event) => {
        if (event.target.files.length === 0 || !currentFolderElement) return;
        const file = event.target.files[0];
        const folderName = currentFolderElement.dataset.folderName;
        saveFileToDB(folderName, file, currentFolderElement);
        event.target.value = null;
        currentFolderElement = null;
    });
    
    initDB();
});