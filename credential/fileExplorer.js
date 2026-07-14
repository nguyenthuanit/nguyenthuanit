// ==========================================
// 1. INDEXEDDB HELPER (Hỗ trợ Tree Structure & Blob Upload)
// ==========================================
const IDBHelper = {
    db: null,
    dbName: 'OS_Cloud_DB',
    storeName: 'files',

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 2);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('parentId', 'parentId', { unique: false });
                }
            };
            request.onsuccess = (e) => { this.db = e.target.result; resolve(); };
            request.onerror = (e) => reject(e.target.error);
        });
    },

    addItem(item) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readwrite');
            const request = tx.objectStore(this.storeName).put(item);
            request.onsuccess = () => resolve(item);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    deleteItem(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readwrite');
            tx.objectStore(this.storeName).delete(id);
            tx.oncomplete = () => resolve();
        });
    },

    getItemsByParent(parentId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readonly');
            const index = tx.objectStore(this.storeName).index('parentId');
            const request = index.getAll(parentId);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    getItemById(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readonly');
            const request = tx.objectStore(this.storeName).get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }
};

// ==========================================
// 2. WINDOW MANAGER (Z-Index & Window controls)
// ==========================================
const WindowManager = {
    highestZ: 1000,
    activeWinId: null,

    init() {
        document.querySelectorAll('.os-window').forEach(win => {
            win.addEventListener('mousedown', () => this.bringToFront(win.id));
            this.setupDrag(win);
            this.setupResize(win);
        });
    },

    bringToFront(winId) {
        const win = document.getElementById(winId);
        if (!win) return;
        this.highestZ += 1;
        win.style.zIndex = this.highestZ;
        document.querySelectorAll('.os-window').forEach(w => w.classList.remove('active-window'));
        win.classList.add('active-window');
        this.activeWinId = winId;
        
        // Cập nhật chấm sáng trên Dock
        const dockItem = document.querySelector(`.dock-item[data-app="${winId}"]`);
        if (dockItem) dockItem.classList.add('running');
    },

    open(winId) {
        const win = document.getElementById(winId);
        if (!win) return;
        win.style.display = 'flex';
        this.bringToFront(winId);
    },

    close(winId) {
        const win = document.getElementById(winId);
        if (!win) return;
        win.style.display = 'none';
        const dockItem = document.querySelector(`.dock-item[data-app="${winId}"]`);
        if (dockItem) dockItem.classList.remove('running');
    },

    minimize(winId) {
        const win = document.getElementById(winId);
        if (win) win.style.display = 'none';
    },

    toggle(winId) {
        const win = document.getElementById(winId);
        if (!win) return;
        if (win.style.display === 'none') {
            this.open(winId);
        } else if (this.activeWinId === winId) {
            this.minimize(winId);
        } else {
            this.bringToFront(winId);
        }
    },

    maximize(winId) {
        const win = document.getElementById(winId);
        if (!win) return;
        if (win.dataset.maximized === 'true') {
            win.style.top = win.dataset.oldTop;
            win.style.left = win.dataset.oldLeft;
            win.style.width = win.dataset.oldWidth;
            win.style.height = win.dataset.oldHeight;
            win.style.borderRadius = 'var(--radius-m)';
            win.dataset.maximized = 'false';
        } else {
            win.dataset.oldTop = win.style.top || `${win.offsetTop}px`;
            win.dataset.oldLeft = win.style.left || `${win.offsetLeft}px`;
            win.dataset.oldWidth = win.style.width || `${win.offsetWidth}px`;
            win.dataset.oldHeight = win.style.height || `${win.offsetHeight}px`;
            win.style.top = '28px'; win.style.left = '0';
            win.style.width = '100vw'; win.style.height = 'calc(100vh - 28px)';
            win.style.borderRadius = '0';
            win.dataset.maximized = 'true';
        }
    },

    setupDrag(win) {
        const titleBar = win.querySelector('.window-title-bar');
        let isDragging = false, startX, startY, initialLeft, initialTop;

        titleBar.addEventListener('mousedown', (e) => {
            if (e.target.closest('.window-controls-macos') || win.dataset.maximized === 'true') return;
            isDragging = true;
            startX = e.clientX; startY = e.clientY;
            initialLeft = win.offsetLeft; initialTop = win.offsetTop;
            document.body.style.cursor = 'move';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX, dy = e.clientY - startY;
            win.style.left = `${Math.max(0, initialLeft + dx)}px`;
            win.style.top = `${Math.max(28, initialTop + dy)}px`;
        });

        window.addEventListener('mouseup', () => {
            isDragging = false; document.body.style.cursor = 'default';
        });
    },

    setupResize(win) {
        const handle = win.querySelector('.resize-handle');
        if (!handle) return;
        let isResizing = false, startX, startY, startW, startH;

        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation(); isResizing = true;
            startX = e.clientX; startY = e.clientY;
            startW = win.offsetWidth; startH = win.offsetHeight;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            win.style.width = `${Math.max(400, startW + (e.clientX - startX))}px`;
            win.style.height = `${Math.max(250, startH + (e.clientY - startY))}px`;
        });

        window.addEventListener('mouseup', () => { isResizing = false; });
    }
};

// ==========================================
// 3. CORE FILE EXPLORER & OS LOGIC
// ==========================================
const FileExplorer = {
    state: {
        isSystemOn: false,
        currentFolderId: 'root-docs',
        selectedItemId: null,
        contextTargetId: null,
        viewMode: 'grid',
        modalMode: 'file', // 'file' hoặc 'folder'
        editingItemId: null
    },

    // 4 Thư mục gốc mặc định
    rootFolders: [
        { id: 'root-docs', name: 'Documents', icon: 'fa-solid fa-file-lines' },
        { id: 'root-downloads', name: 'Downloads', icon: 'fa-solid fa-circle-down' },
        { id: 'root-pictures', name: 'Pictures', icon: 'fa-solid fa-image' },
        { id: 'root-music', name: 'Music', icon: 'fa-solid fa-music' }
    ],

    async init() {
        await IDBHelper.init();
        await this.seedDefaultData();
        WindowManager.init();
        this.setupEventListeners();
        this.startClock();
    },

    async seedDefaultData() {
        // Tạo file mặc định nếu chưa có
        const check = await IDBHelper.getItemById('file-wallpaper');
        if (!check) {
            await IDBHelper.addItem({
                id: 'file-wallpaper',
                parentId: 'root-pictures',
                name: 'wallpaper_2.jpeg',
                type: 'image',
                content: 'wallpaper_2.jpeg' // Sử dụng trực tiếp ảnh local
            });
            await IDBHelper.addItem({
                id: 'file-welcome',
                parentId: 'root-docs',
                name: 'Welcome.txt',
                type: 'file',
                content: 'Chào mừng bạn đến với OS Cloud!\nHệ điều hành giả lập trên nền Web hỗ trợ IndexedDB, Nested Folders và Terminal.'
            });
        }
    },

    setupEventListeners() {
        // Power & Login
        document.getElementById('powerBtn').addEventListener('click', () => this.togglePower());
        document.getElementById('connectBtn').addEventListener('click', () => this.login());
        document.getElementById('ipPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') this.login(); });

        // Navigation & Views
        document.getElementById('btnNavBack').addEventListener('click', () => this.navigateBack());
        document.getElementById('viewGridBtn').addEventListener('click', () => this.setViewMode('grid'));
        document.getElementById('viewListBtn').addEventListener('click', () => this.setViewMode('list'));

        // Modals & New Items
        document.getElementById('btnNewFolder').addEventListener('click', () => this.openCreateModal('folder'));
        document.getElementById('btnNewFile').addEventListener('click', () => this.openCreateModal('file'));
        document.getElementById('newItemConfirmBtn').addEventListener('click', () => this.confirmCreateItem());
        document.getElementById('itemNameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') this.confirmCreateItem(); });

        // Explorer Click & Double Click
        const body = document.getElementById('explorerBody');
        body.addEventListener('click', (e) => this.handleItemClick(e));
        body.addEventListener('dblclick', (e) => this.handleItemDoubleClick(e));

        // Context Menu
        body.addEventListener('contextmenu', (e) => this.showContextMenu(e));
        document.getElementById('contextMenu').addEventListener('click', (e) => this.handleContextMenuAction(e));
        window.addEventListener('click', () => document.getElementById('contextMenu').style.display = 'none');

        // Drag & Drop Upload từ máy tính thật
        body.addEventListener('dragover', (e) => { e.preventDefault(); body.classList.add('drag-over'); });
        body.addEventListener('dragleave', () => body.classList.remove('drag-over'));
        body.addEventListener('drop', (e) => this.handleExternalDrop(e));

        // Text Editor Save
        document.getElementById('editorSaveBtn').addEventListener('click', () => this.saveTextEditor());

        // Phím tắt toàn cầu
        window.addEventListener('keydown', (e) => {
            // Ctrl + \ hoặc Ctrl + ~ để bật nhanh Terminal
            if (e.ctrlKey && (e.key === '\\' || e.key === '`' || e.key === '~')) {
                e.preventDefault();
                if (this.state.isSystemOn) WindowManager.toggle('terminalWindow');
            }
        });
    },

    startClock() {
        setInterval(() => {
            const now = new Date();
            document.getElementById('clockDisplay').textContent = now.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }) + ' ' + now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        }, 1000);
    },

    togglePower() {
        const powerBtn = document.getElementById('powerBtn');
        if (!this.state.isSystemOn) {
            powerBtn.classList.add('active');
            document.getElementById('dock').style.display = 'flex';
            WindowManager.open('explorerWindow');
            this.state.isSystemOn = true;
            this.renderSidebar();
            this.loadFolder(this.state.currentFolderId);
        } else {
            powerBtn.classList.remove('active');
            document.getElementById('dock').style.display = 'none';
            document.querySelectorAll('.os-window').forEach(w => w.style.display = 'none');
            this.state.isSystemOn = false;
        }
    },

    login() {
        document.getElementById('loginOverlay').style.display = 'none';
        this.togglePower();
    },

    renderSidebar() {
        const sidebar = document.getElementById('sidebarFavorites');
        sidebar.innerHTML = '<li style="font-size: 11px; opacity: 0.5; padding: 4px 10px; cursor: default;">FAVORITES</li>';
        this.rootFolders.forEach(folder => {
            const li = document.createElement('li');
            li.innerHTML = `<i class="${folder.icon}"></i> <span>${folder.name}</span>`;
            if (folder.id === this.state.currentFolderId) li.classList.add('active');
            li.onclick = () => {
                this.state.currentFolderId = folder.id;
                this.renderSidebar();
                this.loadFolder(folder.id);
            };
            sidebar.appendChild(li);
        });
    },

    async loadFolder(folderId) {
        this.state.currentFolderId = folderId;
        this.state.selectedItemId = null;
        
        // Render Breadcrumb
        await this.renderBreadcrumb(folderId);

        // Fetch items từ IndexedDB
        const items = await IDBHelper.getItemsByParent(folderId);
        const body = document.getElementById('explorerBody');
        body.innerHTML = '';
        body.className = `explorer-body ${this.state.viewMode}-view`;

        if (items.length === 0) {
            body.innerHTML = '<div style="width: 100%; text-align: center; color: var(--icon-color); margin-top: 20px;">Thư mục trống</div>';
            return;
        }

        // Sắp xếp: Thư mục trước, File sau
        items.sort((a, b) => (a.type === b.type) ? a.name.localeCompare(b.name) : (a.type === 'folder' ? -1 : 1));

        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'file-item';
            el.dataset.id = item.id;
            el.dataset.type = item.type;
            el.dataset.name = item.name;

            let icon = 'fa-solid fa-file-lines';
            if (item.type === 'folder') icon = 'fa-solid fa-folder';
            if (item.type === 'image') icon = 'fa-solid fa-image';

            el.innerHTML = `<i class="${icon}"></i><span>${item.name}</span>`;
            body.appendChild(el);
        });
    },

    async renderBreadcrumb(targetFolderId) {
        const bar = document.getElementById('breadcrumbBar');
        bar.innerHTML = '';
        const path = [];
        let currentId = targetFolderId;

        // Truy ngược parentId lên gốc
        while (currentId) {
            const root = this.rootFolders.find(r => r.id === currentId);
            if (root) {
                path.unshift({ id: root.id, name: root.name });
                break;
            }
            const folder = await IDBHelper.getItemById(currentId);
            if (folder) {
                path.unshift({ id: folder.id, name: folder.name });
                currentId = folder.parentId;
            } else break;
        }

        path.forEach((step, idx) => {
            const span = document.createElement('span');
            span.className = 'breadcrumb-item';
            span.textContent = step.name;
            span.onclick = () => this.loadFolder(step.id);
            bar.appendChild(span);
            if (idx < path.length - 1) {
                const sep = document.createElement('span');
                sep.className = 'breadcrumb-sep'; sep.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
                bar.appendChild(sep);
            }
        });
        document.getElementById('explorerTitleText').textContent = path[path.length - 1]?.name || 'Explorer';
    },

    async navigateBack() {
        const current = await IDBHelper.getItemById(this.state.currentFolderId);
        if (current && current.parentId) {
            this.loadFolder(current.parentId);
        } else {
            // Nếu đang ở Root mà bấm Back thì về Documents
            const isRoot = this.rootFolders.some(r => r.id === this.state.currentFolderId);
            if (!isRoot) this.loadFolder('root-docs');
        }
    },

    setViewMode(mode) {
        this.state.viewMode = mode;
        document.getElementById('viewGridBtn').classList.toggle('active', mode === 'grid');
        document.getElementById('viewListBtn').classList.toggle('active', mode === 'list');
        this.loadFolder(this.state.currentFolderId);
    },

    handleItemClick(e) {
        if (this.state.editingItemId) return;
        const item = e.target.closest('.file-item');
        document.querySelectorAll('.file-item.selected').forEach(el => el.classList.remove('selected'));
        if (item) {
            item.classList.add('selected');
            this.state.selectedItemId = item.dataset.id;
        } else {
            this.state.selectedItemId = null;
        }
    },

    async handleItemDoubleClick(e) {
        const el = e.target.closest('.file-item');
        if (!el) return;
        const id = el.dataset.id;
        const type = el.dataset.type;

        if (type === 'folder') {
            this.loadFolder(id);
        } else {
            const file = await IDBHelper.getItemById(id);
            if (type === 'image') {
                document.getElementById('quickLookImage').src = file.content;
                document.getElementById('quickLookFileName').textContent = file.name;
                document.getElementById('quickLookModal').style.display = 'flex';
            } else {
                // Mở Text Editor
                document.getElementById('textEditorFileName').textContent = file.name;
                document.getElementById('editorTextArea').value = file.content || '';
                document.getElementById('textEditorWindow').dataset.fileId = file.id;
                WindowManager.open('textEditorWindow');
            }
        }
    },

    openCreateModal(type) {
        this.state.modalMode = type;
        document.getElementById('modalTitle').textContent = type === 'folder' ? 'Create New Folder' : 'Create New File';
        document.getElementById('modalLabel').textContent = type === 'folder' ? 'Folder Name:' : 'File Name (thêm .txt nếu muốn):';
        const input = document.getElementById('itemNameInput');
        input.value = '';
        document.getElementById('newItemModal').style.display = 'flex';
        input.focus();
    },

    async confirmCreateItem() {
        let name = document.getElementById('itemNameInput').value.trim();
        if (!name) return;
        if (this.state.modalMode === 'file' && !name.includes('.')) name += '.txt';

        const newItem = {
            id: `item-${Date.now()}`,
            parentId: this.state.currentFolderId,
            name: name,
            type: this.state.modalMode === 'folder' ? 'folder' : 'file',
            content: ''
        };
        await IDBHelper.addItem(newItem);
        document.getElementById('newItemModal').style.display = 'none';
        this.loadFolder(this.state.currentFolderId);
    },

    async saveTextEditor() {
        const fileId = document.getElementById('textEditorWindow').dataset.fileId;
        if (!fileId) return;
        const file = await IDBHelper.getItemById(fileId);
        if (file) {
            file.content = document.getElementById('editorTextArea').value;
            await IDBHelper.addItem(file);
            alert('Đã lưu tệp thành công!');
        }
    },

    showContextMenu(e) {
        e.preventDefault();
        const item = e.target.closest('.file-item');
        const menu = document.getElementById('contextMenu');
        
        if (item) {
            this.state.contextTargetId = item.dataset.id;
            this.handleItemClick(e);
            menu.querySelector('[data-action="rename"]').style.display = 'flex';
            menu.querySelector('[data-action="delete"]').style.display = 'flex';
        } else {
            this.state.contextTargetId = null;
            menu.querySelector('[data-action="rename"]').style.display = 'none';
            menu.querySelector('[data-action="delete"]').style.display = 'none';
        }

        menu.style.display = 'block';
        menu.style.left = `${Math.min(e.clientX, window.innerWidth - 160)}px`;
        menu.style.top = `${Math.min(e.clientY, window.innerHeight - 150)}px`;
    },

    async handleContextMenuAction(e) {
        const action = e.target.closest('li')?.dataset.action;
        if (!action) return;
        document.getElementById('contextMenu').style.display = 'none';

        if (action === 'new-folder') this.openCreateModal('folder');
        if (action === 'new-file') this.openCreateModal('file');
        if (action === 'delete' && this.state.contextTargetId) {
            if (this.state.contextTargetId === 'file-wallpaper') return alert('Không thể xóa hình nền mặc định.');
            if (confirm('Bạn có chắc chắn muốn xóa mục này?')) {
                await IDBHelper.deleteItem(this.state.contextTargetId);
                this.loadFolder(this.state.currentFolderId);
            }
        }
        if (action === 'rename' && this.state.contextTargetId) {
            this.beginRename(this.state.contextTargetId);
        }
    },

    beginRename(itemId) {
        this.state.editingItemId = itemId;
        const el = document.querySelector(`.file-item[data-id="${itemId}"]`);
        const span = el.querySelector('span');
        const oldName = span.textContent;
        
        const input = document.createElement('input');
        input.type = 'text'; input.className = 'rename-input'; input.value = oldName;
        span.style.display = 'none'; el.appendChild(input);
        input.focus(); input.select();

        const finish = async () => {
            if (!this.state.editingItemId) return;
            this.state.editingItemId = null;
            const newName = input.value.trim() || oldName;
            input.remove(); span.style.display = '';
            if (newName !== oldName) {
                const item = await IDBHelper.getItemById(itemId);
                item.name = newName;
                await IDBHelper.addItem(item);
                this.loadFolder(this.state.currentFolderId);
            }
        };
        input.addEventListener('blur', finish);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(); });
    },

    // Kéo thả upload file từ OS máy tính vào Web OS
    handleExternalDrop(e) {
        e.preventDefault();
        document.getElementById('explorerBody').classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length === 0) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const isImg = file.type.startsWith('image/');
                await IDBHelper.addItem({
                    id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                    parentId: this.state.currentFolderId,
                    name: file.name,
                    type: isImg ? 'image' : 'file',
                    content: event.target.result // Base64 chuỗi
                });
                this.loadFolder(this.state.currentFolderId);
            };
            if (file.type.startsWith('image/')) reader.readAsDataURL(file);
            else reader.readAsText(file);
        });
    }
};

// Khởi chạy OS khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    FileExplorer.init();
});