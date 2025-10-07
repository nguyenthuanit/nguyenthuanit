document.addEventListener('DOMContentLoaded', () => {
    // === GLOBAL UTILITIES ===
    const WindowStateManager = {
        saveState(id, rect) {
            try {
                localStorage.setItem(`windowState_${id}`, JSON.stringify(rect));
            } catch (e) {
                console.error("Could not save window state:", e);
            }
        },
        loadState(id) {
            try {
                const state = localStorage.getItem(`windowState_${id}`);
                return state ? JSON.parse(state) : null;
            } catch (e) {
                console.error("Could not load window state:", e);
                return null;
            }
        }
    };

    const dockFileExplorer = document.getElementById('dockFileExplorer');
    const dockTerminal = document.getElementById('dockTerminal');

    // === QUẢN LÝ ĐỒNG HỒ ===
    function startClock() {
        const clockElement = document.getElementById('clock');
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const update = () => {
            const now = new Date();
            const day = days[now.getDay()];
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            clockElement.textContent = `${day} ${hours}:${minutes}`;
        };
        update();
        setInterval(update, 30000);
    }
    startClock();

    // === QUẢN LÝ POPUP ===
    const PopupManager = {
        popup: document.getElementById('winPopup'),
        title: document.getElementById('winPopupTitle'),
        message: document.getElementById('winPopupMessage'),
        icon: document.getElementById('winPopupIcon'),
        okBtn: document.getElementById('winPopupOkBtn'),
        cancelBtn: document.getElementById('winPopupCancelBtn'),
        closeBtn: document.getElementById('winPopupCloseBtn'),
        init() {
            this.closeBtn.addEventListener('click', () => this.hide());
        },
        show(title, message, type = 'info') {
            this.title.textContent = title;
            this.message.textContent = message;
            this.icon.className = '';
            this.cancelBtn.style.display = 'none';
            if (type === 'error') {
                this.icon.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>'; this.icon.classList.add('icon-error');
            } else if (type === 'confirm') {
                this.icon.innerHTML = '<i class="fa-solid fa-circle-question"></i>'; this.icon.classList.add('icon-confirm');
                this.cancelBtn.style.display = 'inline-block';
            } else {
                this.icon.innerHTML = '<i class="fa-solid fa-circle-info"></i>'; this.icon.classList.add('icon-info');
            }
            this.popup.style.display = 'flex';
        },
        hide() { this.popup.style.display = 'none'; },
        alert(title, message, type = 'info') {
            this.show(title, message, type);
            return new Promise(resolve => {
                this.okBtn.onclick = () => { this.hide(); resolve(true); };
            });
        },
        confirm(title, message) {
            this.show(title, message, 'confirm');
            return new Promise(resolve => {
                this.okBtn.onclick = () => { this.hide(); resolve(true); };
                this.cancelBtn.onclick = () => { this.hide(); resolve(false); };
                this.closeBtn.onclick = () => { this.hide(); resolve(false); };
            });
        }
    };
    PopupManager.init();

    // === TERMINAL LOGIC ===
    const Terminal = {
        window: document.getElementById('terminalWindow'),
        output: document.getElementById('terminalOutput'),
        input: document.getElementById('terminalInput'),
        closeBtn: document.getElementById('closeTerminalBtn'),
        isRunning: false,
        isLoggedIn: false,
        passwordAttempts: 0,
        onCompleteCallback: null,
        passwordHandler: null,
        menuHandler: null,
        CORRECT_PASSWORD_HASH: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        preAuthLines: [
            { text: 'Booting system...', delay: 500 },
            { text: 'Connecting to server //103.77.201.52...', delay: 900 },
            { text: 'Connection established.', delay: 500 },
            { text: 'Authenticating user: admin', delay: 800 },
        ],
        postAuthLines: [
            { text: '[OK] ACCESS GRANTED.', delay: 500 },
            { text: 'Loading user profile...', delay: 800 },
        ],
        menuText: [
            { text: '\nWelcome, admin. Please select an option:' },
            { text: '(1) File Explorer' },
            { text: '(2) System Diagnostics' },
            { text: '(3) Network Configuration' },
            { text: '(4) Security Logs' },
            { text: '(5) Check for Updates' },
            { text: '(6) Help' },
        ],
        init() {
            this.passwordHandler = this.handlePasswordSubmit.bind(this);
            this.menuHandler = this.handleMenuInput.bind(this);

            this.closeBtn.addEventListener('click', () => this.hide());
            this.window.addEventListener('click', () => { this.input.focus(); });
            dragElement(this.window, document.getElementById('terminalTitleBar'));
            
            const savedState = WindowStateManager.loadState('terminalWindow');
            if(savedState) {
                this.window.style.top = savedState.top;
                this.window.style.left = savedState.left;
                this.window.style.width = savedState.width;
                this.window.style.height = savedState.height;
            }
        },
        show() { this.window.style.display = 'flex'; },
        hide() { this.window.style.display = 'none'; this.isRunning = false; },
        async printLines(lines) {
            for (const line of lines) {
                if (!this.isRunning) break;
                this.output.innerHTML += `<span class="line">${line.text}</span>`;
                this.output.scrollTop = this.output.scrollHeight;
                await new Promise(resolve => setTimeout(resolve, line.delay));
            }
        },
        promptForPassword() {
            this.output.innerHTML += `<span>[sudo] password for admin: </span>`;
            this.input.focus();
            this.input.removeEventListener('keydown', this.menuHandler);
            this.input.addEventListener('keydown', this.passwordHandler);
        },
        handlePasswordSubmit(event) {
            if (event.key !== 'Enter') return;

            this.input.removeEventListener('keydown', this.passwordHandler);
            const pass = this.input.value;
            this.input.value = '';
            this.output.innerHTML += '\n';

            if(sha256(pass) === this.CORRECT_PASSWORD_HASH) {
                this.isLoggedIn = true;
                this.runPostAuth();
            } else {
                this.passwordAttempts++;
                if (this.passwordAttempts >= 3) {
                    this.output.innerHTML += `<span class="line error">Authentication failed. Maximum attempts reached.</span>`;
                    this.isRunning = false;
                } else {
                    this.output.innerHTML += `<span class="line error">Sorry, try again.</span>`;
                    this.promptForPassword();
                }
            }
        },
        async runPostAuth() {
            await this.printLines(this.postAuthLines);
            if (this.isRunning) {
                if (this.onCompleteCallback) this.onCompleteCallback();
                this.showMenu();
            }
        },
        async showMenu() {
            await this.printLines(this.menuText);
            this.promptForMenuChoice();
        },
        promptForMenuChoice() {
            this.output.innerHTML += `\n<span>admin@os-sim:~$ </span>`;
            this.output.scrollTop = this.output.scrollHeight;
            this.input.focus();
            this.input.removeEventListener('keydown', this.passwordHandler);
            this.input.addEventListener('keydown', this.menuHandler);
        },
        handleMenuInput(event) {
            if (event.key !== 'Enter') return;
            
            const choice = this.input.value.trim();
            this.input.value = '';
            this.output.innerHTML += `${choice}\n`;

            let commandProcessed = true;
            switch (choice) {
                case '1':
                    this.output.innerHTML += `<span class="line">Opening File Explorer...</span>`;
                    FileExplorer.show();
                    break;
                case '2':
                case '3':
                case '4':
                case '5':
                    this.output.innerHTML += `<span class="line">This feature is a placeholder and is not yet implemented.</span>`;
                    break;
                case '6':
                case 'help':
                    // Just show the menu again
                    break;
                default:
                    commandProcessed = false;
                    if (choice) { // Only show error if user typed something
                       this.output.innerHTML += `<span class="line error">Invalid command: '${choice}'. Type '6' or 'help' for options.</span>`;
                    }
                    break;
            }
            // Loop back to the menu prompt
            if (commandProcessed) {
                this.promptForMenuChoice();
            } else {
                // If it was an invalid command, show the menu list again for clarity
                this.showMenu();
            }
        },
        async run(onComplete) {
            if (this.isRunning) return;
            this.isRunning = true; 
            this.isLoggedIn = false;
            this.passwordAttempts = 0;
            this.onCompleteCallback = onComplete;
            this.output.innerHTML = '';
            this.show();
            await this.printLines(this.preAuthLines);
            if (this.isRunning) this.promptForPassword();
        }
    };
    Terminal.init();
    
    // === DOCK LOGIC ===
    function setupDock() {
        document.querySelectorAll('.dock-item').forEach(item => {
            const clickHandler = (e) => {
                if (item.classList.contains('disabled')) {
                    PopupManager.alert('System Locked', 'Please log in via the Terminal to unlock the system.', 'info');
                    return;
                }
                
                if (item.classList.contains('placeholder')) {
                    PopupManager.alert(
                        'System Error', 
                        'This feature has been blocked by the system.', 
                        'error'
                    );
                    return;
                }
                
                if(item.id === 'dockFileExplorer') {
                    if (FileExplorer.isInitialized) FileExplorer.toggleVisibility();
                } else if (item.id === 'dockTerminal') {
                    if (!Terminal.isRunning) {
                         Terminal.run(() => {
                            // This callback runs once the login is successful
                            dockFileExplorer.classList.remove('disabled');
                         });
                    } else {
                        Terminal.show();
                    }
                }
            };

            item.addEventListener('click', clickHandler);
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    clickHandler(e);
                }
            });
        });

        dockFileExplorer.classList.add('disabled');
    }
    setupDock();

    // === DBManager & FILE EXPLORER ===
    const DBManager = {
        db: null, DB_NAME: 'fixedFoldersDB', FILE_STORE: 'files', FOLDER_STORE: 'folders',
        init() { return new Promise((resolve, reject) => { const request = indexedDB.open(this.DB_NAME, 1); request.onupgradeneeded = (event) => { const db = event.target.result; if (!db.objectStoreNames.contains(this.FILE_STORE)) db.createObjectStore(this.FILE_STORE, { keyPath: 'id' }); if (!db.objectStoreNames.contains(this.FOLDER_STORE)) db.createObjectStore(this.FOLDER_STORE, { keyPath: 'id' }); }; request.onsuccess = (event) => { this.db = event.target.result; resolve(); }; request.onerror = (event) => reject(event.target.errorCode); }); },
        saveFile: (file, folderId) => new Promise((resolve, reject) => { const tx = DBManager.db.transaction(DBManager.FILE_STORE, 'readwrite'); const fileRecord = { id: Date.now(), folderId, fileData: file, fileName: file.name, fileSize: file.size, fileType: file.type, lastModified: new Date() }; const request = tx.objectStore(DBManager.FILE_STORE).put(fileRecord); request.onsuccess = () => resolve(fileRecord); request.onerror = (e) => reject(e.target.error); }),
        getFilesByFolder: (folderId) => new Promise((resolve, reject) => { const store = DBManager.db.transaction(DBManager.FILE_STORE).objectStore(DBManager.FILE_STORE); const allFiles = []; const request = store.openCursor(); request.onsuccess = event => { const cursor = event.target.result; if (cursor) { if (cursor.value.folderId === folderId) allFiles.push(cursor.value); cursor.continue(); } else { resolve(allFiles); } }; request.onerror = (e) => reject(e.target.error); }),
        deleteFile: (fileId) => new Promise((resolve, reject) => { const request = DBManager.db.transaction(DBManager.FILE_STORE, 'readwrite').objectStore(DBManager.FILE_STORE).delete(fileId); request.onsuccess = () => resolve(); request.onerror = (e) => reject(e.target.error); }),
        saveFolder: (folder) => new Promise((resolve, reject) => { const request = DBManager.db.transaction(DBManager.FOLDER_STORE, 'readwrite').objectStore(DBManager.FOLDER_STORE).put(folder); request.onsuccess = () => resolve(folder); request.onerror = (e) => reject(e.target.error); }),
        getAllFolders: () => new Promise((resolve, reject) => { const request = DBManager.db.transaction(DBManager.FOLDER_STORE).objectStore(DBManager.FOLDER_STORE).getAll(); request.onsuccess = e => resolve(e.target.result); request.onerror = (e) => reject(e.target.error); }),
        deleteFolder: (folderId) => new Promise(async (resolve, reject) => { try { const files = await DBManager.getFilesByFolder(folderId); const tx = DBManager.db.transaction([DBManager.FILE_STORE, DBManager.FOLDER_STORE], 'readwrite'); const fileStore = tx.objectStore(DBManager.FILE_STORE); files.forEach(file => fileStore.delete(file.id)); const folderStore = tx.objectStore(DBManager.FOLDER_STORE); folderStore.delete(folderId); tx.oncomplete = () => resolve(); tx.onerror = (e) => reject(e.target.error); } catch (e) { reject(e); } }),
    };
    const FileExplorer = {
        isInitialized: false,
        explorerWindow: document.getElementById('explorerWindow'), explorerTitleBar: document.getElementById('explorerTitleBar'), explorerBody: document.getElementById('explorerBody'),
        fileUploadInput: document.getElementById('fileUploadInput'), 
        backButton: document.getElementById('backButton'), 
        addFileBtn: document.getElementById('addFileBtn'),
        addressInput: document.getElementById('addressInput'),
        contextMenu: document.getElementById('contextMenu'), newFolderAction: document.getElementById('newFolderAction'), deleteAction: document.getElementById('deleteAction'),
        minimizeBtn: document.getElementById('minimizeBtn'), maximizeBtn: document.getElementById('maximizeBtn'), maximizeIcon: document.getElementById('maximizeIcon'),
        restoreIcon: document.getElementById('restoreIcon'), closeMainBtn: document.getElementById('closeMainBtn'),
        filePreviewModal: document.getElementById('filePreviewModal'), modalCloseBtn: document.getElementById('modalCloseBtn'), modalFileName: document.getElementById('modalFileName'),
        filePreviewContent: document.getElementById('filePreviewContent'), downloadFileLink: document.getElementById('downloadFileLink'), fileMetadata: document.getElementById('fileMetadata'),
        state: { currentView: 'folders', currentFolder: null, currentItemForAction: null, isMaximized: false, lastPosition: {} },
        fixedFolders: [ { id: 'fixed-1', name: 'Documents', isDeletable: false }, { id: 'fixed-2', name: 'Downloads', isDeletable: false }, { id: 'fixed-3', name: 'Pictures', isDeletable: false }, { id: 'fixed-4', name: 'Music', isDeletable: false } ],
        async init() {
            if (this.isInitialized) return;
            try {
                await DBManager.init();
                const folders = await DBManager.getAllFolders();
                if (folders.length === 0) {
                    for (const folder of this.fixedFolders) await DBManager.saveFolder(folder);
                }
            } catch (e) {
                PopupManager.alert('Database Error', 'Could not initialize the file system. Please try again.', 'error');
                return;
            }
            this.setupEventListeners();
            this.render();
            dragElement(this.explorerWindow, this.explorerTitleBar);
            makeResizable(this.explorerWindow);
            
            const savedState = WindowStateManager.loadState('explorerWindow');
            if (savedState) {
                this.explorerWindow.style.top = savedState.top;
                this.explorerWindow.style.left = savedState.left;
                this.explorerWindow.style.width = savedState.width;
                this.explorerWindow.style.height = savedState.height;
            }

            this.isInitialized = true;
        },
        show(){
             if (!this.isInitialized) this.init();
            this.explorerWindow.style.display = 'flex';
            dockFileExplorer.classList.add('active');
        },
        toggleVisibility() {
            const isVisible = this.explorerWindow.style.display !== 'none';
            isVisible ? this.handleMinimize() : this.show();
        },
        async render() {
            this.explorerBody.innerHTML = '<div class="loading-spinner"></div>';
            this.updateAddressBar();
            try {
                if (this.state.currentView === 'folders') {
                    this.explorerBody.classList.remove('list-view');
                    this.backButton.style.display = 'none';
                    this.addFileBtn.style.display = 'none';
                    const folders = await DBManager.getAllFolders();
                    this.explorerBody.innerHTML = '';
                    folders.forEach(folder => this.explorerBody.appendChild(this.createFolderElement(folder)));
                } else if (this.state.currentView === 'files') {
                    this.explorerBody.classList.add('list-view');
                    this.backButton.style.display = 'block';
                    this.addFileBtn.style.display = 'block';
                    const files = await DBManager.getFilesByFolder(this.state.currentFolder.id);
                    this.explorerBody.innerHTML = '';
                    this.explorerBody.appendChild(this.createListViewHeader());
                    files.forEach(file => this.explorerBody.appendChild(this.createFileElement(file)));
                }
            } catch (e) {
                 this.explorerBody.innerHTML = '<p style="padding: 20px; text-align: center;">Error loading items.</p>';
                 PopupManager.alert('File System Error', 'Could not retrieve items from the database.', 'error');
            }
        },
        updateAddressBar() {
            const basePath = '//103.77.201.52/user/';
            this.addressInput.value = this.state.currentFolder ? `${basePath} > ${this.state.currentFolder.name}` : basePath;
        },
        createFolderElement(folder) {
            const el = document.createElement('div');
            el.className = 'grid-item folder-item';
            el.dataset.id = folder.id; el.dataset.name = folder.name; el.dataset.type = 'folder'; el.dataset.deletable = folder.isDeletable || false;
            const iconClass = folder.icon === 'desktop' ? 'fa-solid fa-desktop' : 'fa-solid fa-folder';
            el.innerHTML = `<i class="${iconClass}"></i><span>${folder.name}</span>`;
            return el;
        },
        createFileElement(file) {
            const el = document.createElement('div');
            el.className = 'grid-item file-item';
            el.dataset.id = file.id; el.dataset.type = 'file';
            const iconClass = this.getIconForFileType(file.fileType);
            el.innerHTML = `<div class="item-col col-name"><i class="${iconClass}"></i><span>${file.fileName}</span></div><div class="item-col col-date"><span>${this.formatDate(file.lastModified)}</span></div><div class.item-col col-size"><span>${this.formatBytes(file.fileSize)}</span></div>`;
            return el;
        },
        createListViewHeader() { const el = document.createElement('div'); el.className = 'list-view-header'; el.innerHTML = `<div class="col-name"><span>Name</span></div><div class="col-date"><span>Date modified</span></div><div class="col-size"><span>Size</span></div>`; return el; },
        getIconForFileType(fileType) {
            if (fileType.startsWith('image/')) return 'fa-solid fa-file-image';
            if (fileType.includes('pdf')) return 'fa-solid fa-file-pdf';
            if (fileType.includes('word')) return 'fa-solid fa-file-word';
            return 'fa-solid fa-file-lines';
        },
        deselectAllItems() { document.querySelectorAll('.grid-item.selected').forEach(el => el.classList.remove('selected')); },
        selectItem(item) { this.deselectAllItems(); if(item) item.classList.add('selected'); },
        setupEventListeners() {
            this.minimizeBtn.addEventListener('click', () => this.handleMinimize());
            this.maximizeBtn.addEventListener('click', () => this.handleMaximize());
            this.closeMainBtn.addEventListener('click', () => this.handleClose());
            this.backButton.addEventListener('click', () => this.navigateBack());
            this.addFileBtn.addEventListener('click', () => this.fileUploadInput.click());
            this.explorerBody.addEventListener('mousedown', (e) => this.handleClick(e));
            this.explorerBody.addEventListener('contextmenu', (e) => this.handleRightClick(e));
            this.fileUploadInput.addEventListener('change', (e) => this.handleFileUpload(e));
            this.newFolderAction.addEventListener('click', () => this.handleNewFolder());
            this.deleteAction.addEventListener('click', () => this.handleDelete());
            window.addEventListener('click', (e) => { 
                if (!e.target.closest('.context-menu')) {
                    this.contextMenu.style.display = 'none';
                }
            });
            this.modalCloseBtn.addEventListener('click', () => this.hidePreviewModal());
            this.filePreviewModal.addEventListener('click', (e) => { if (e.target === this.filePreviewModal) this.hidePreviewModal(); });
        },
        handleMinimize() { this.explorerWindow.style.display = 'none'; dockFileExplorer.classList.remove('active'); },
        handleMaximize() {
            if (this.state.isMaximized) {
                this.explorerWindow.classList.remove('maximized');
                const { top, left, width, height } = this.state.lastPosition;
                this.explorerWindow.style.top = top; this.explorerWindow.style.left = left;
                this.explorerWindow.style.width = width; this.explorerWindow.style.height = height;
                this.maximizeIcon.style.display = 'block'; this.restoreIcon.style.display = 'none';
            } else {
                const rect = this.explorerWindow.getBoundingClientRect();
                this.state.lastPosition = { top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px` };
                this.explorerWindow.classList.add('maximized');
                this.maximizeIcon.style.display = 'none'; this.restoreIcon.style.display = 'block';
            }
            this.state.isMaximized = !this.state.isMaximized;
        },
        handleClose() {
            this.explorerWindow.style.display = 'none';
            dockFileExplorer.classList.remove('active');
            if (this.state.isMaximized) this.handleMaximize();
        },
        handleClick(e) {
            if (e.button !== 0) return;
            const item = e.target.closest('.grid-item');
            if (item) {
                this.selectItem(item);
            } else {
                this.deselectAllItems();
            }
            if (!item) return;
            const { type, id, name } = item.dataset;
            if (e.detail === 2) { 
                if (type === 'folder') {
                    this.state.currentView = 'files';
                    this.state.currentFolder = { id, name };
                    this.render();
                } else if (type === 'file') {
                    DBManager.db.transaction('files').objectStore('files').get(parseInt(id)).onsuccess = e => {
                       if(e.target.result) this.showPreviewModal(e.target.result);
                    };
                }
            }
        },
        navigateBack() { this.state.currentView = 'folders'; this.state.currentFolder = null; this.render(); },
        handleRightClick(e) {
            e.preventDefault();
            const item = e.target.closest('.grid-item');
            this.selectItem(item);
            this.newFolderAction.style.display = 'none';
            this.deleteAction.style.display = 'none';
            if (item) {
                if (item.dataset.deletable === 'true' || item.dataset.type === 'file') {
                    this.state.currentItemForAction = { id: item.dataset.id, type: item.dataset.type };
                    this.deleteAction.style.display = 'flex';
                }
            } else if (e.target.closest('.explorer-body') && this.state.currentView === 'folders') {
                this.newFolderAction.style.display = 'flex';
            } else { return; }
            this.contextMenu.style.top = `${e.clientY}px`;
            this.contextMenu.style.left = `${e.clientX}px`;
            this.contextMenu.style.display = 'block';
        },
        async handleNewFolder() {
            const folderName = prompt('Nhập tên thư mục mới:');
            if (folderName) {
                const newFolder = { id: `user-folder-${Date.now()}`, name: folderName, icon: 'desktop', isDeletable: true };
                try {
                    await DBManager.saveFolder(newFolder);
                    this.render();
                } catch(e) {
                    PopupManager.alert('Error', 'Could not create new folder.', 'error');
                }
            }
        },
        async handleFileUpload(e) {
            if (e.target.files.length > 0 && this.state.currentFolder) {
                try {
                    await DBManager.saveFile(e.target.files[0], this.state.currentFolder.id);
                    this.render();
                } catch (e) {
                    PopupManager.alert('Error', 'Could not save the file.', 'error');
                } finally {
                    this.fileUploadInput.value = null;
                }
            }
        },
        async handleDelete() {
            const { id, type } = this.state.currentItemForAction;
            if (!id || !type) return;
            const confirmed = await PopupManager.confirm('Xác nhận xóa', `Bạn có chắc muốn xóa vĩnh viễn ${type} này?`);
            if (confirmed) {
                try {
                    if (type === 'folder') await DBManager.deleteFolder(id);
                    else if (type === 'file') await DBManager.deleteFile(parseInt(id));
                    this.render();
                } catch (e) {
                    PopupManager.alert('Error', `Could not delete the ${type}.`, 'error');
                }
            }
            this.state.currentItemForAction = null;
        },
        formatDate: (date) => { if (!date) return ''; const d = new Date(date); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; },
        formatBytes: (bytes, d=2) => { if(bytes===0) return '0 Bytes'; const i=Math.floor(Math.log(bytes)/Math.log(1024)); return `${parseFloat((bytes/Math.pow(1024,i)).toFixed(d))} ${['Bytes','KB','MB','GB'][i]}`},
        showPreviewModal(fileRecord) {
            const { fileData, fileName, fileSize, fileType } = fileRecord;
            this.modalFileName.textContent = fileName;
            this.fileMetadata.innerHTML = `<span><strong>Loại:</strong> ${fileType}</span> | <span><strong>Kích thước:</strong> ${this.formatBytes(fileSize)}</span>`;
            const fileURL = URL.createObjectURL(fileData);
            this.downloadFileLink.href = fileURL; this.downloadFileLink.download = fileName;
            this.filePreviewContent.innerHTML = '';
            if (fileType.startsWith('image/')) {
                const img = document.createElement('img'); img.src = fileURL; this.filePreviewContent.appendChild(img);
            } else if (fileType.startsWith('text/') || fileType === 'application/json') {
                const reader = new FileReader();
                reader.onload = (e) => { const pre = document.createElement('pre'); pre.textContent = e.target.result; this.filePreviewContent.appendChild(pre); };
                reader.readAsText(fileData);
            } else {
                this.filePreviewContent.textContent = `Không thể xem trước file '${fileName}'.`;
            }
            this.filePreviewModal.style.display = 'flex';
        },
        hidePreviewModal() {
            if (this.downloadFileLink.href) URL.revokeObjectURL(this.downloadFileLink.href);
            this.filePreviewModal.style.display = 'none';
        }
    };
    function dragElement(elmnt, header) {
        let p1=0,p2=0,p3=0,p4=0;
        (header || elmnt).onmousedown=dragMouseDown;
        function dragMouseDown(e){ if (FileExplorer.state.isMaximized) return; e=e||window.event; e.preventDefault(); p3=e.clientX; p4=e.clientY; document.onmouseup=closeDragElement; document.onmousemove=elementDrag; }
        function elementDrag(e){ e=e||window.event; e.preventDefault(); p1=p3-e.clientX; p2=p4-e.clientY; p3=e.clientX; p4=e.clientY; elmnt.style.top=(elmnt.offsetTop-p2)+"px"; elmnt.style.left=(elmnt.offsetLeft-p1)+"px"; }
        function closeDragElement(){ document.onmouseup=null; document.onmousemove=null; 
            const rect = { top: elmnt.style.top, left: elmnt.style.left, width: elmnt.style.width, height: elmnt.style.height };
            WindowStateManager.saveState(elmnt.id, rect);
        }
    }
    function makeResizable(element) {
        const resizers = element.querySelectorAll('.resizer');
        resizers.forEach(resizer => {
            resizer.addEventListener('mousedown', (e) => {
                if (FileExplorer.state.isMaximized) return;
                e.preventDefault();
                const rect = element.getBoundingClientRect();
                const original_w = rect.width; const original_h = rect.height;
                const original_x = e.clientX; const original_y = e.clientY;
                const original_left = rect.left; const original_top = rect.top;
                const currentResizer = e.target;
                const doResize = (e) => {
                    const minWidth = parseInt(getComputedStyle(element).minWidth);
                    const minHeight = parseInt(getComputedStyle(element).minHeight);
                    if (currentResizer.classList.contains('resizer-br') || currentResizer.classList.contains('resizer-b') || currentResizer.classList.contains('resizer-tr') || currentResizer.classList.contains('resizer-bl')) {
                        const height = original_h + (e.clientY - original_y);
                        if(height > minHeight) element.style.height = height + 'px';
                    }
                     if (currentResizer.classList.contains('resizer-br') || currentResizer.classList.contains('resizer-r') || currentResizer.classList.contains('resizer-tl') || currentResizer.classList.contains('resizer-tr')) {
                        const width = original_w + (e.clientX - original_x);
                        if(width > minWidth) element.style.width = width + 'px';
                    }
                    if (currentResizer.classList.contains('resizer-l') || currentResizer.classList.contains('resizer-tl') || currentResizer.classList.contains('resizer-bl')) {
                        const width = original_w - (e.clientX - original_x);
                        if (width > minWidth) {
                           element.style.width = width + 'px';
                           element.style.left = original_left + (e.clientX - original_x) + 'px';
                        }
                    }
                    if (currentResizer.classList.contains('resizer-t') || currentResizer.classList.contains('resizer-tl') || currentResizer.classList.contains('resizer-tr')) {
                        const height = original_h - (e.clientY - original_y);
                        if (height > minHeight) {
                            element.style.height = height + 'px';
                            element.style.top = original_top + (e.clientY - original_y) + 'px';
                        }
                    }
                };
                const stopResize = () => {
                    window.removeEventListener('mousemove', doResize);
                    window.removeEventListener('mouseup', stopResize);
                    const newRect = { top: element.style.top, left: element.style.left, width: element.style.width, height: element.style.height };
                    WindowStateManager.saveState(element.id, newRect);
                };
                window.addEventListener('mousemove', doResize);
                window.addEventListener('mouseup', stopResize);
            });
        });
    }
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (document.getElementById('filePreviewModal').style.display === 'flex') {
                FileExplorer.hidePreviewModal();
            } else if (document.getElementById('winPopup').style.display === 'flex') {
                PopupManager.hide();
            } else if (document.getElementById('explorerWindow').style.display === 'flex') {
                FileExplorer.handleClose();
            }
        }
    });
});