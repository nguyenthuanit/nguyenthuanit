// js/fileExplorer.js

// --- CẬP NHẬT: IndexedDB Helper (Thêm `updateItem`) ---
const IDBHelper = {
    db: null,
    dbName: 'OS_FileSystem',
    storeName: 'files',

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                if (!this.db.objectStoreNames.contains(this.storeName)) {
                    const store = this.db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('parentFolderKey', 'parentFolderKey', { unique: false });
                }
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };
            request.onerror = (event) => reject(event.target.error);
        });
    },

    addFile(fileData) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.add(fileData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    deleteFile(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    },

    getFilesByFolder(folderKey) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readonly');
            const store = tx.objectStore(this.storeName);
            const index = store.index('parentFolderKey');
            const request = index.getAll(folderKey);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    // THÊM MỚI: Lấy 1 file bằng ID (cho Text Editor)
    getFileById(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    // THÊM MỚI: Cập nhật một file (cho Rename và Text Editor)
    updateFile(fileData) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.put(fileData); // put = update if exists
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }
};

const FileExplorer = {
    // CẬP NHẬT: Thêm DOM Elements
    explorerWindow: document.getElementById('explorerWindow'),
    explorerMain: document.querySelector('.explorer-body-container'),
    explorerBody: document.getElementById('explorerBody'),
    explorerTitleText: document.getElementById('explorerTitleText'),
    explorerTitleBar: document.getElementById('explorerTitleBar'),
    sidebarFavorites: document.getElementById('sidebarFavorites'),
    closeExplorerBtn: document.getElementById('closeExplorerBtn'),
    minimizeBtn: document.querySelector('.traffic-light.minimize'),
    maximizeBtn: document.querySelector('.traffic-light.maximize'),
    viewGridBtn: document.getElementById('viewGridBtn'), // Thêm
    viewListBtn: document.getElementById('viewListBtn'), // Thêm
    powerBtn: document.getElementById('powerBtn'),
    terminalBtn: document.getElementById('terminalBtn'),
    explorerBtn: document.getElementById('explorerBtn'),
    connectionStatus: document.getElementById('connectionStatus'),
    loginOverlay: document.getElementById('loginOverlay'),
    passwordInput: document.getElementById('ipPass'),
    connectBtn: document.getElementById('connectBtn'),
    newItemBtn: document.getElementById('newItemBtn'),
    quickLookModal: document.getElementById('quickLookModal'),
    quickLookImage: document.getElementById('quickLookImage'),
    quickLookFileName: document.getElementById('quickLookFileName'),
    contextMenu: document.getElementById('contextMenu'),
    
    newItemModal: document.getElementById('newItemModal'),
    newItemForm: document.getElementById('newItemForm'),
    fileNameInput: document.getElementById('fileNameInput'),
    newItemCreateBtn: document.getElementById('newItemCreateBtn'),
    newItemCancelBtn: document.getElementById('newItemCancelBtn'),

    // THÊM MỚI: DOM cho Text Editor
    textEditorModal: document.getElementById('textEditorModal'),
    textEditorTitleBar: document.getElementById('textEditorTitleBar'),
    textEditorFileName: document.getElementById('textEditorFileName'),
    editorTextArea: document.getElementById('editorTextArea'),
    editorSaveBtn: document.getElementById('editorSaveBtn'),
    editorCloseBtn: document.getElementById('editorCloseBtn'),

    // THÊM MỚI: DOM cho Resize
    resizeHandle: document.getElementById('resizeHandle'),

    // State
    state: {
        activeFolderKey: 'Documents',
        currentViewMode: 'grid', // CẬP NHẬT: Thêm state cho view mode
        selectedItemId: null,
        contextTargetId: null,
        isSystemOn: false,
        isLoggedIn: false,
        isDragging: false,
        isMaximized: false,
        isResizing: false, // THÊM MỚI: State cho resize
        editingItemId: null, // THÊM MỚI: State cho rename
        editorFileId: null, // THÊM MỚI: State cho text editor
        lastWindowState: null,
        dragOffsetX: 0,
        dragOffsetY: 0,
    },

    // fsData (Không đổi)
    fsData: {
        'Documents': { id: 'fixed-1', icon: 'fa-solid fa-file-lines', children: [] },
        'Downloads': { id: 'fixed-2', icon: 'fa-solid fa-circle-down', children: [ { id: 'file-3', fileName: 'wallpaper.jpeg', type: 'image' } ] },
        'Pictures': { id: 'fixed-3', icon: 'fa-solid fa-image', children: [] },
        'Music': { id: 'fixed-4', icon: 'fa-solid fa-music', children: [] }
    },

    async init() {
        try {
            await IDBHelper.init();
        } catch (error) {
            console.error("Failed to initialize database:", error);
            alert("Error: Could not start file system database.");
        }
        this.setupEventListeners();
    },

    async render() {
        if (!this.state.isSystemOn) return;
        if (this.state.isLoggedIn) {
            this.loginOverlay.style.display = 'none';
            this.explorerMain.style.display = 'flex';
            this.renderSidebar();
            this.renderExplorer(); // <
        } else {
            this.loginOverlay.style.display = 'flex';
            this.explorerMain.style.display = 'none';
            this.passwordInput.value = '';
            this.passwordInput.focus();
        }
    },
    
    renderSidebar() {
        this.sidebarFavorites.innerHTML = '<li class="sidebar-header">Favorites</li>';
        for (const key in this.fsData) {
            const folder = this.fsData[key];
            const li = document.createElement('li');
            li.dataset.id = folder.id;
            li.dataset.key = key;
            li.innerHTML = `<i class="${folder.icon}"></i><span>${key}</span>`;
            if (this.state.activeFolderKey === key) li.classList.add('active');
            this.sidebarFavorites.appendChild(li);
        }
    },

    renderExplorer() {
        const activeFolder = this.fsData[this.state.activeFolderKey];
        if (!this.explorerBody || !activeFolder) return;

        this.explorerBody.innerHTML = '';
        // CẬP NHẬT: Thêm class view mode
        this.explorerBody.className = `explorer-body ${this.state.currentViewMode}-view`;
        this.explorerTitleText.textContent = this.state.activeFolderKey;

        const items = activeFolder.children;
        if (items.length > 0) {
            items.sort((a, b) => {
                if (a.fileName === 'wallpaper.jpeg') return 1;
                if (b.fileName === 'wallpaper.jpeg') return -1;
                return a.fileName.localeCompare(b.fileName);
            });
            items.forEach(item => this.explorerBody.appendChild(this.createFileElement(item)));
        } else {
            this.explorerBody.innerHTML = '<p style="color: var(--icon-color); width: 100%; text-align: center;">This folder is empty.</p>';
        }
    },

    createFileElement(file) {
        // CẬP NHẬT: Logic tạo element cho cả Grid và List
        const el = document.createElement('div');
        const viewClass = this.state.currentViewMode === 'grid' ? 'grid-item' : 'list-item';
        el.className = `${viewClass} file-item`;
        el.dataset.id = file.id;
        el.dataset.name = file.fileName;
        el.dataset.type = file.type;

        let iconClass = 'fa-solid fa-file';
        if (file.type === 'image') iconClass = 'fa-solid fa-image';
        if (file.fileName.endsWith('.txt')) iconClass = 'fa-solid fa-file-lines';
        if (file.type === 'folder') iconClass = 'fa-solid fa-folder';

        if (this.state.selectedItemId === file.id) el.classList.add('selected');
        
        // Tạo span để chứa tên (cho phép đổi tên)
        const nameSpan = `<span>${file.fileName}</span>`;
        el.innerHTML = `<i class="${iconClass}"></i>${nameSpan}`;
        
        return el;
    },

    setupEventListeners() {
        this.powerBtn?.addEventListener('click', () => this.toggleSystemPower());
        this.explorerBtn?.addEventListener('click', () => this.toggleExplorerWindow());
        this.connectBtn?.addEventListener('click', () => this.handleLogin());
        this.passwordInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.handleLogin(); });
        
        this.closeExplorerBtn?.addEventListener('click', () => this.handleLogoutAndClose());
        this.minimizeBtn?.addEventListener('click', () => this.hide());
        this.maximizeBtn?.addEventListener('click', () => this.toggleMaximize());

        this.sidebarFavorites.addEventListener('click', (e) => this.handleSidebarClick(e));
        
        // CẬP NHẬT: Thêm listeners cho các tính năng mới
        this.newItemBtn?.addEventListener('click', () => this.showNewItemModal());
        this.viewGridBtn?.addEventListener('click', () => this.toggleViewMode('grid'));
        this.viewListBtn?.addEventListener('click', () => this.toggleViewMode('list'));

        this.explorerBody.addEventListener('click', (e) => this.handleItemClick(e));
        this.explorerBody.addEventListener('dblclick', (e) => this.handleItemDoubleClick(e)); // Thêm
        
        this.explorerBody.addEventListener('contextmenu', (e) => this.showContextMenu(e));
        this.contextMenu.addEventListener('click', (e) => this.handleContextMenuClick(e));
        
        window.addEventListener('click', (e) => {
            if (!e.target.closest('#contextMenu') && !e.target.closest('#newItemModal') && this.state.editingItemId === null) {
                this.hideContextMenu();
            }
            if (e.target === this.newItemModal) this.hideNewItemModal();
            if (e.target === this.textEditorModal) this.closeTextEditor(); // Đóng nếu click ra ngoài
        });

        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.quickLookModal.addEventListener('click', () => this.hideQuickLook());

        // Listeners cho kéo thả cửa sổ
        this.explorerTitleBar.addEventListener('mousedown', (e) => this.dragStart(e));
        window.addEventListener('mousemove', (e) => {
            this.dragMove(e);
            this.resizeMove(e); // Thêm
        });
        window.addEventListener('mouseup', () => {
            this.dragEnd();
            this.resizeEnd(); // Thêm
        });

        // Listeners cho New Item Modal
        this.newItemCreateBtn?.addEventListener('click', () => this.submitNewFile());
        this.newItemCancelBtn?.addEventListener('click', () => this.hideNewItemModal());
        this.fileNameInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.submitNewFile();
            if (e.key === 'Escape') this.hideNewItemModal();
        });

        // THÊM MỚI: Listeners cho Text Editor
        this.editorSaveBtn?.addEventListener('click', () => this.saveTextEditor());
        this.editorCloseBtn?.addEventListener('click', () => this.closeTextEditor());
        this.textEditorTitleBar?.addEventListener('mousedown', (e) => this.dragStart(e, this.textEditorModal.querySelector('.text-editor-window'))); // Kéo editor

        // THÊM MỚI: Listeners cho Resize Handle
        this.resizeHandle?.addEventListener('mousedown', (e) => this.resizeStart(e));
    },

    async loadFileSystemFromDB() {
        console.log("Loading file system from IndexedDB...");
        try {
            for (const key in this.fsData) {
                const filesFromDB = await IDBHelper.getFilesByFolder(key);
                const staticFiles = this.fsData[key].children.filter(f => f.id.startsWith('file-'));
                this.fsData[key].children = [...staticFiles, ...filesFromDB];
            }
        } catch (error) {
            console.error("Failed to load files from DB:", error);
        }
    },

    async toggleSystemPower() {
        if (this.state.isSystemOn) {
            this.hide();
            this.connectionStatus.textContent = '';
            this.powerBtn.classList.remove('active');
            this.terminalBtn.style.display = 'none';
            this.explorerBtn.style.display = 'none';
            this.state.isSystemOn = false;
            this.state.isLoggedIn = false;
        } else {
            this.connectionStatus.textContent = 'Connecting...';
            this.powerBtn.style.pointerEvents = 'none';
            await new Promise(resolve => setTimeout(resolve, 1500));
            await this.loadFileSystemFromDB(); // Tải DB
            this.connectionStatus.textContent = '';
            this.show();
            this.powerBtn.classList.add('active');
            this.terminalBtn.style.display = 'block';
            this.explorerBtn.style.display = 'block';
            this.state.isSystemOn = true;
            this.powerBtn.style.pointerEvents = 'auto';
        }
    },

    async handleLogin() {
        const enteredPassword = this.passwordInput.value;
        const correctHash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';

        const encoder = new TextEncoder();
        const data = encoder.encode(enteredPassword);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const enteredHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (enteredHash === correctHash) {
            this.state.isLoggedIn = true;
            this.render();
        } else {
            this.loginOverlay.querySelector('.login-form').style.animation = 'shake 0.5s';
            setTimeout(() => {
                this.loginOverlay.querySelector('.login-form').style.animation = '';
            }, 500);
            this.passwordInput.value = '';
        }
    },

    handleLogoutAndClose() {
        this.hide();
        this.state.isLoggedIn = false;
    },

    handleSidebarClick(e) {
        const target = e.target.closest('li[data-key]');
        if (target) {
            this.state.activeFolderKey = target.dataset.key;
            this.state.selectedItemId = null;
            this.renderSidebar();
            this.renderExplorer();
        }
    },

    handleItemClick(e) {
        // CẬP NHẬT: Không làm gì nếu đang đổi tên
        if (this.state.editingItemId) return; 

        const target = e.target.closest('.file-item');
        document.querySelectorAll('.file-item.selected').forEach(el => el.classList.remove('selected'));
        
        if (target) {
            target.classList.add('selected');
            this.state.selectedItemId = target.dataset.id;
        } else {
            this.state.selectedItemId = null;
        }
    },

    // THÊM MỚI: Xử lý Double-click (Mở Text Editor)
    async handleItemDoubleClick(e) {
        const target = e.target.closest('.file-item');
        if (target) {
            const fileId = target.dataset.id;
            const fileName = target.dataset.name;
            
            if (fileName.endsWith('.txt')) {
                // Mở Text Editor
                this.openTextEditor(fileId);
            } else if (target.dataset.type === 'image') {
                // Mở Quick Look
                const file = this.fsData[this.state.activeFolderKey].children.find(f => f.id === fileId);
                if (file) this.showQuickLook(file);
            }
            // (Tương lai: nếu là folder thì mở folder)
        }
    },

    showNewItemModal() {
        this.newItemModal.style.display = 'flex';
        this.fileNameInput.value = '';
        this.fileNameInput.focus();
    },
    hideNewItemModal() {
        this.newItemModal.style.display = 'none';
    },

    async submitNewFile() {
        const rawName = this.fileNameInput.value.trim();
        if (!rawName) {
            this.newItemForm.style.animation = 'shake 0.5s';
            setTimeout(() => { this.newItemForm.style.animation = ''; }, 500);
            return;
        }
        const fileName = rawName + '.txt';
        const newFile = {
            id: `file-db-${Date.now()}`,
            fileName: fileName,
            type: 'file',
            content: '', // THÊM MỚI: Nội dung trống cho text editor
            parentFolderKey: this.state.activeFolderKey
        };
        try {
            await IDBHelper.addFile(newFile);
            this.fsData[this.state.activeFolderKey].children.push(newFile);
            this.hideNewItemModal();
            this.renderExplorer();
        } catch (error) {
            console.error("Failed to add new file:", error);
        }
    },
    
    async handleDeleteFile() {
        if (!this.state.contextTargetId) return;
        if (this.state.contextTargetId === 'file-3') {
            alert("Cannot delete the default wallpaper file.");
            this.state.contextTargetId = null;
            return;
        }

        const activeFolderChildren = this.fsData[this.state.activeFolderKey].children;
        const fileIndex = activeFolderChildren.findIndex(f => f.id === this.state.contextTargetId);

        if (fileIndex > -1) {
            const fileName = activeFolderChildren[fileIndex].fileName;
            if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
                try {
                    await IDBHelper.deleteFile(this.state.contextTargetId);
                    activeFolderChildren.splice(fileIndex, 1);
                    if (this.state.selectedItemId === this.state.contextTargetId) {
                        this.state.selectedItemId = null;
                    }
                    this.renderExplorer();
                } catch (error) {
                    console.error("Failed to delete file:", error);
                }
            }
        }
        this.state.contextTargetId = null;
    },

    handleKeyDown(e) {
        if (e.code === 'Space' && this.state.selectedItemId && !this.state.editingItemId) {
            e.preventDefault();
            const activeFolder = this.fsData[this.state.activeFolderKey];
            const selectedFile = activeFolder.children.find(f => f.id === this.state.selectedItemId);
            if (selectedFile && selectedFile.type === 'image') {
                this.showQuickLook(selectedFile);
            }
        }
        if (e.key === 'Escape') {
            this.hideQuickLook();
            this.hideNewItemModal();
            this.closeTextEditor();
        }
        // THÊM MỚI: Phím tắt Rename (Enter hoặc F2 trên Windows)
        if (e.key === 'Enter' && this.state.selectedItemId && !this.state.editingItemId) {
            this.beginRename(this.state.selectedItemId);
        }
    },

    showQuickLook(file) {
        this.quickLookImage.src = file.fileName;
        this.quickLookFileName.textContent = file.fileName;
        this.quickLookModal.style.display = 'flex';
    },
    hideQuickLook() {
        this.quickLookModal.style.display = 'none';
        this.quickLookImage.src = '';
    },

    show() { 
        this.explorerWindow.style.display = 'flex'; 
        this.render();
    },
    hide() { 
        if (this.state.isMaximized) this.toggleMaximize();
        this.explorerWindow.style.display = 'none'; 
    },
    toggleExplorerWindow() {
        if (this.explorerWindow.style.display === 'none') this.show();
        else this.hide();
    },

    // --- CẬP NHẬT: Context Menu ---
    showContextMenu(e) {
        e.preventDefault();
        this.hideContextMenu(); 

        const targetItem = e.target.closest('.file-item');
        const deleteOption = this.contextMenu.querySelector('[data-action="delete"]');
        const newOption = this.contextMenu.querySelector('[data-action="new"]');
        const renameOption = this.contextMenu.querySelector('[data-action="rename"]'); // Thêm

        if (targetItem) {
            this.state.contextTargetId = targetItem.dataset.id;
            this.handleItemClick(e); 
            deleteOption.style.display = 'flex';
            renameOption.style.display = 'flex'; // Thêm
            newOption.style.display = 'none';
        } else {
            this.state.contextTargetId = null;
            deleteOption.style.display = 'none';
            renameOption.style.display = 'none'; // Thêm
            newOption.style.display = 'flex';
        }

        this.contextMenu.style.display = 'block';
        const { clientX: mouseX, clientY: mouseY } = e;
        const { offsetWidth: menuWidth, offsetHeight: menuHeight } = this.contextMenu;
        const { innerWidth: winWidth, innerHeight: winHeight } = window;
        let x = mouseX + 5, y = mouseY + 5;
        if (mouseX + menuWidth + 5 > winWidth) x = mouseX - menuWidth - 5;
        if (mouseY + menuHeight + 5 > winHeight) y = mouseY - menuHeight - 5;
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.style.left = `${x}px`;
    },
    hideContextMenu() {
        this.contextMenu.style.display = 'none';
        this.state.contextTargetId = null;
    },
    handleContextMenuClick(e) {
        const target = e.target.closest('li[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        
        if (action === 'new') this.showNewItemModal();
        else if (action === 'delete') this.handleDeleteFile();
        else if (action === 'rename') this.beginRename(this.state.contextTargetId); // Thêm
        
        this.hideContextMenu();
    },

    // --- THÊM MỚI: Tính năng (1) Text Editor ---
    async openTextEditor(fileId) {
        try {
            const file = await IDBHelper.getFileById(fileId);
            if (file) {
                this.state.editorFileId = file.id;
                this.textEditorFileName.textContent = file.fileName;
                this.editorTextArea.value = file.content || ''; // Tải nội dung
                this.textEditorModal.style.display = 'flex';
                this.editorTextArea.focus();
            }
        } catch (error) {
            console.error("Error opening file:", error);
        }
    },
    closeTextEditor() {
        this.textEditorModal.style.display = 'none';
        this.state.editorFileId = null;
    },
    async saveTextEditor() {
        const fileId = this.state.editorFileId;
        if (!fileId) return;

        try {
            const file = await IDBHelper.getFileById(fileId); // Lấy file gốc
            file.content = this.editorTextArea.value; // Cập nhật nội dung
            
            await IDBHelper.updateFile(file); // Lưu lại vào DB

            // Cập nhật state cục bộ (nếu cần, nhưng ở đây không cần render lại)
            
            this.closeTextEditor();
        } catch (error) {
            console.error("Error saving file:", error);
        }
    },

    // --- THÊM MỚI: Tính năng (2) Đổi tên ---
    beginRename(itemId) {
        if (!itemId) return;
        this.state.editingItemId = itemId;
        
        const itemElement = this.explorerBody.querySelector(`.file-item[data-id="${itemId}"]`);
        if (!itemElement) return;

        const span = itemElement.querySelector('span');
        const currentName = itemElement.dataset.name.replace('.txt', ''); // Bỏ .txt
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'rename-input';
        input.value = currentName;
        
        // Thay thế span bằng input
        span.style.display = 'none';
        if (this.state.currentViewMode === 'grid') {
            itemElement.appendChild(input);
        } else {
            span.parentElement.appendChild(input); // Thêm vào sau span
        }
        
        input.focus();
        input.select();

        // Hàm để hoàn tất
        const finishRename = async () => {
            if (!this.state.editingItemId) return; // Đã xong
            
            const newNameRaw = input.value.trim();
            const newName = newNameRaw ? (newNameRaw + '.txt') : (currentName + '.txt');
            
            // Xóa input, hiện lại span
            input.remove();
            span.style.display = '';
            
            if (newNameRaw && (newNameRaw !== currentName)) {
                // Chỉ cập nhật nếu tên thực sự thay đổi
                try {
                    const file = await IDBHelper.getFileById(itemId);
                    file.fileName = newName;
                    await IDBHelper.updateFile(file); // Lưu vào DB
                    
                    // Cập nhật state cục bộ
                    const localFile = this.fsData[this.state.activeFolderKey].children.find(f => f.id === itemId);
                    localFile.fileName = newName;
                    
                    this.renderExplorer(); // Render lại
                } catch (error) {
                    console.error("Error renaming file:", error);
                }
            }
            this.state.editingItemId = null;
        };

        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finishRename();
            if (e.key === 'Escape') {
                input.value = currentName; // Hủy
                finishRename();
            }
        });
    },

    // --- THÊM MỚI: Tính năng (3) List View ---
    toggleViewMode(mode) {
        if (this.state.currentViewMode === mode) return;
        this.state.currentViewMode = mode;
        
        if (mode === 'grid') {
            this.viewGridBtn.classList.add('active');
            this.viewListBtn.classList.remove('active');
        } else {
            this.viewGridBtn.classList.remove('active');
            this.viewListBtn.classList.add('active');
        }
        
        this.renderExplorer(); // Render lại với view mode mới
    },

    // --- Window Drag & Maximize Logic ---
    toggleMaximize() {
        if (window.innerWidth <= 768) return;
        if (this.state.isMaximized) {
            const { top, left, width, height } = this.state.lastWindowState;
            this.explorerWindow.style.top = top;
            this.explorerWindow.style.left = left;
            this.explorerWindow.style.width = width;
            this.explorerWindow.style.height = height;
            this.explorerWindow.style.borderRadius = 'var(--radius-m)';
            this.state.isMaximized = false;
            this.state.lastWindowState = null;
            this.explorerWindow.classList.remove('maximized'); // Thêm
        } else {
            this.state.lastWindowState = {
                top: this.explorerWindow.style.top || `${this.explorerWindow.offsetTop}px`,
                left: this.explorerWindow.style.left || `${this.explorerWindow.offsetLeft}px`,
                width: this.explorerWindow.style.width || `${this.explorerWindow.offsetWidth}px`,
                height: this.explorerWindow.style.height || `${this.explorerWindow.offsetHeight}px`,
            };
            this.explorerWindow.style.top = '28px';
            this.explorerWindow.style.left = '0';
            this.explorerWindow.style.width = '100vw';
            this.explorerWindow.style.height = 'calc(100vh - 28px)';
            this.explorerWindow.style.borderRadius = '0';
            this.state.isMaximized = true;
            this.explorerWindow.classList.add('maximized'); // Thêm
        }
    },

    dragStart(e, targetWindow = this.explorerWindow) {
        // CẬP NHẬT: Cho phép kéo nhiều cửa sổ
        // Chỉ kéo title bar của explorer HOẶC title bar của editor
        const isExplorerTitle = e.target === this.explorerTitleBar;
        const isEditorTitle = e.target === this.textEditorTitleBar;
        
        if (e.button !== 0 || this.state.isMaximized) return;
        
        // Xác định cửa sổ nào đang được kéo
        let windowEl;
        if (isExplorerTitle) windowEl = this.explorerWindow;
        else if (isEditorTitle) windowEl = this.textEditorModal.querySelector('.text-editor-window');
        else return; // Không kéo nếu không phải title bar

        this.state.isDragging = true;
        this.state.dragTarget = windowEl; // Lưu mục tiêu kéo
        this.state.dragOffsetX = e.clientX - windowEl.offsetLeft;
        this.state.dragOffsetY = e.clientY - windowEl.offsetTop;
        e.target.style.cursor = 'grabbing';
    },

    dragMove(e) {
        if (!this.state.isDragging) return;
        e.preventDefault();
        
        const windowEl = this.state.dragTarget;
        let newX = e.clientX - this.state.dragOffsetX;
        let newY = e.clientY - this.state.dragOffsetY;

        const topBarHeight = (windowEl === this.explorerWindow) ? 28 : 0; // Giới hạn khác nhau
        newY = Math.max(newY, topBarHeight);
        newX = Math.max(newX, 0);
        newX = Math.min(newX, window.innerWidth - windowEl.offsetWidth);
        newY = Math.min(newY, window.innerHeight - windowEl.offsetHeight);

        windowEl.style.left = `${newX}px`;
        windowEl.style.top = `${newY}px`;
    },

    dragEnd() {
        if (this.state.isDragging) {
            this.explorerTitleBar.style.cursor = 'move';
            this.textEditorTitleBar.style.cursor = 'move';
            this.state.isDragging = false;
            this.state.dragTarget = null;
        }
    },

    // --- THÊM MỚI: Tính năng (4) Resize Logic ---
    resizeStart(e) {
        if (this.state.isMaximized) return;
        e.preventDefault();
        this.state.isResizing = true;
        // Lưu vị trí bắt đầu của chuột
        this.state.lastResizeX = e.clientX;
        this.state.lastResizeY = e.clientY;
    },

    resizeMove(e) {
        if (!this.state.isResizing) return;
        e.preventDefault();

        const rect = this.explorerWindow.getBoundingClientRect();
        const minWidth = 400; // Lấy từ CSS
        const minHeight = 300; // Lấy từ CSS

        // Tính toán độ thay đổi
        let newWidth = rect.width + (e.clientX - this.state.lastResizeX);
        let newHeight = rect.height + (e.clientY - this.state.lastResizeY);

        // Áp dụng giới hạn
        if (newWidth > minWidth) {
            this.explorerWindow.style.width = `${newWidth}px`;
            this.state.lastResizeX = e.clientX; // Cập nhật vị trí cuối
        }
        if (newHeight > minHeight) {
            this.explorerWindow.style.height = `${newHeight}px`;
            this.state.lastResizeY = e.clientY; // Cập nhật vị trí cuối
        }
    },

    resizeEnd() {
        this.state.isResizing = false;
    },
};

// Khởi động ứng dụng
document.addEventListener('DOMContentLoaded', () => {
    FileExplorer.init();
});