document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & CONSTANTS ---
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    const DB_VERSION = 2; 
    let db;

    // --- DOM Elements ---
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const mainTitle = document.getElementById('main-title');
    const menuItems = document.querySelectorAll('.menu-item');
    const contentSections = document.querySelectorAll('.content-section');
    const toastContainer = document.getElementById('toast-container');
    const welcomeName = document.getElementById('profile-welcome-name');
    const avatarImg = document.getElementById('profile-avatar-img');
    const ordersTableBody = document.getElementById('orders-table-body');
    const logoutBtn = document.getElementById('logout-btn');
    const themeToggleCheckbox = document.getElementById('theme-toggle-checkbox');
    const totalOrdersCount = document.getElementById('total-orders-count');
    const pendingOrdersCount = document.getElementById('pending-orders-count');
    const completedOrdersCount = document.getElementById('completed-orders-count');
    const displayFullName = document.getElementById('display-fullName');
    const displayEmail = document.getElementById('display-email');
    const displayPhone = document.getElementById('display-phone');
    const displayAddress = document.getElementById('display-address');
    const orderModal = document.getElementById('order-modal');
    const orderForm = document.getElementById('order-form');
    const confirmModal = document.getElementById('confirm-modal');
    const logConsole = document.getElementById('log-console');
    const logContent = document.getElementById('log-content');
    
    // --- INITIALIZATION ---
    if (!loggedInUser) {
        alert("Vui lòng đăng nhập để tiếp tục.");
        window.location.href = 'login.html';
        return;
    }

    // === CẢI TIẾN: HÀM TẠO MÃ ĐƠN HÀNG NGẪU NHIÊN ===
    function generateOrderCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789'; // Bỏ I, O, 0 để tránh nhầm lẫn
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result.slice(0, 3) + '-' + result.slice(3);
    }

    // --- UI UTILITIES ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { info: 'bx-info-circle', success: 'bx-check-circle', error: 'bx-x-circle' };
        toast.innerHTML = `<i class='bx ${icons[type]}'></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    function showConfirmModal(message, onConfirm, isDanger = false) {
        const messageEl = confirmModal.querySelector('#confirm-message');
        const confirmBtn = confirmModal.querySelector('#modal-confirm-btn');
        const cancelBtn = confirmModal.querySelector('#modal-cancel-btn');
        messageEl.textContent = message;
        confirmBtn.className = `modal-confirm-btn ${isDanger ? 'danger' : ''}`;
        openModal(confirmModal);
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        const handleConfirm = () => { closeModal(confirmModal); onConfirm(true); };
        const handleCancel = () => { closeModal(confirmModal); onConfirm(false); };
        newConfirmBtn.addEventListener('click', handleConfirm, { once: true });
        cancelBtn.addEventListener('click', handleCancel, { once: true });
    }

    const openModal = (modal) => modal.classList.add('visible');
    const closeModal = (modal) => modal.classList.remove('visible');

    // --- LOGGING UTILITY ---
    function log(message, type = 'info') {
        const now = new Date();
        const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.dataset.logType = type;
        entry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span><span class="log-message ${type}">${message}</span>`;
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
    }
    
    // --- INDEXEDDB CORE ---
    function setupDatabase() {
        log(`Đang mở database v${DB_VERSION}...`, 'info');
        const request = indexedDB.open('userAuthDB', 2);
        
        request.onerror = (event) => log(`Lỗi database: ${event.target.error}`, 'error');
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            log("Database cần nâng cấp/khởi tạo.", 'info');
            if (!db.objectStoreNames.contains('orders')) {
                const orderStore = db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
                orderStore.createIndex('by_username', 'username', { unique: false });
            }
            if (!db.objectStoreNames.contains('userProfile')) { db.createObjectStore('userProfile', { keyPath: 'username' }); }
            if (!db.objectStoreNames.contains('credentials')) { db.createObjectStore('credentials', { keyPath: 'username' }); }
        };
        request.onsuccess = (event) => {
            db = event.target.result;
            log("Kết nối database thành công!", 'success');
            checkUserStatus();
        };
    }

    function createTransaction(storeNames, mode) {
        return db.transaction(storeNames, mode);
    }

    function promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // --- SECURITY & DATA LOADING ---
    async function checkUserStatus() {
        try {
            const user = await promisifyRequest(createTransaction('credentials', 'readonly').objectStore('credentials').get(loggedInUser));
            if (!user || user.status === 'locked') {
                log('Phát hiện tài khoản bị khóa hoặc không tồn tại. Tự động đăng xuất.', 'error');
                sessionStorage.removeItem('loggedInUser');
                alert('Tài khoản của bạn đã bị khóa hoặc không hợp lệ. Vui lòng đăng nhập lại.');
                window.location.href = 'login.html';
            } else {
                loadInitialData();
            }
        } catch (error) {
            log('Lỗi nghiêm trọng khi kiểm tra trạng thái người dùng.', 'error');
            sessionStorage.removeItem('loggedInUser');
            window.location.href = 'login.html';
        }
    }

    async function loadInitialData() {
        if (!db) { return; }
        log("Đang tải lại dữ liệu tài khoản...", "info");
        try {
            const profile = await promisifyRequest(createTransaction('userProfile', 'readonly').objectStore('userProfile').get(loggedInUser));
            if (profile) updateProfileDOM(profile);
            
            const orders = await promisifyRequest(createTransaction('orders', 'readonly').objectStore('orders').index('by_username').getAll(loggedInUser));
            displayOrders(orders);
        } catch (error) {
            log(`Lỗi khi tải dữ liệu ban đầu: ${error}`, 'error');
            showToast('Không thể tải dữ liệu tài khoản.', 'error');
        }
    }

    function updateProfileDOM(profile) {
        avatarImg.src = profile.avatar || `https://i.pravatar.cc/150?u=${loggedInUser}`;
        welcomeName.textContent = `Xin chào, ${profile.fullName ? profile.fullName.split(' ')[0] : loggedInUser}`;
        displayFullName.textContent = profile.fullName || 'Chưa cập nhật';
        displayEmail.textContent = `${loggedInUser}@system.local`;
        displayPhone.textContent = profile.phone || 'Chưa cập nhật';
        displayAddress.textContent = profile.address || 'Chưa cập nhật';
        log("Cập nhật giao diện hồ sơ thành công.", 'success');
    }
    
    function displayOrders(orders) {
        ordersTableBody.innerHTML = '';
        if (!orders || orders.length === 0) {
            ordersTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Bạn chưa có đơn hàng nào.</td></tr>`;
        } else {
            orders.sort((a, b) => b.id - a.id).forEach(order => ordersTableBody.appendChild(createOrderRow(order)));
        }
        updateDashboardCards(orders || []);
    }
    
    function updateDashboardCards(orders) {
        totalOrdersCount.textContent = orders.length;
        pendingOrdersCount.textContent = orders.filter(o => ['pending', 'pending_approval', 'processing'].includes(o.status)).length;
        completedOrdersCount.textContent = orders.filter(o => o.status === 'completed').length;
    }
    
    const statusMap = {
        pending_approval: { text: "Chờ phê duyệt", class: "pending-approval" },
        pending: { text: "Đang chờ xử lý", class: "pending" },
        processing: { text: "Đang xử lý", class: "processing" },
        transferred: { text: "Chuyển đối tác", class: "transferred" },
        shipped: { text: "Đang giao hàng", class: "shipped" },
        completed: { text: "Hoàn thành", class: "completed" },
        cancelled: { text: "Đã bị hủy", class: "cancelled" }
    };

    function createOrderRow(order) {
        const row = document.createElement('tr');
        row.dataset.orderId = order.id;
        const statusInfo = statusMap[order.status] || { text: order.status, class: "" };
        let statusText = statusInfo.text;
        if (order.requestedStatus) {
            const requestedStatusInfo = statusMap[order.requestedStatus] || { text: order.requestedStatus };
            statusText += ` (-> Yêu cầu: ${requestedStatusInfo.text})`;
        }
        let actionsHTML = '';
        if (order.status === 'pending_approval') {
            actionsHTML = `<button class="table-action-btn edit-btn" title="Sửa"><i class='bx bxs-edit'></i></button><button class="table-action-btn delete-btn" title="Xóa"><i class='bx bxs-trash'></i></button>`;
        }
        const isCancellable = ['pending', 'shipped', 'processing', 'transferred'].includes(order.status);
        if (isCancellable && !order.requestedStatus) {
            actionsHTML += `<button class="table-action-btn request-cancel-btn" title="Yêu cầu Hủy"><i class='bx bxs-x-square'></i></button>`;
        } else if (order.requestedStatus) {
            actionsHTML += `<span style="font-size: 0.8em; color: var(--color-info-dark);">Đang chờ duyệt</span>`;
        }
        
        // === CẢI TIẾN: Hiển thị orderCode nếu có, nếu không thì hiển thị id ===
        const displayId = order.orderCode || order.id;
        row.innerHTML = `<td>#${displayId}</td><td>${new Date(order.date).toLocaleDateString('vi-VN')}</td><td>${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total)}</td><td><span class="status ${statusInfo.class}">${statusText}</span></td><td><div class="action-btn-group">${actionsHTML || 'Không có'}</div></td>`;
        return row;
    }
    
    // --- ORDERS LOGIC ---
    async function handleOrderFormSubmit(event) {
        event.preventDefault();
        const orderId = parseInt(orderForm['order-id'].value);
        const totalValue = parseFloat(orderForm['order-total'].value);
        if (isNaN(totalValue) || totalValue < 0) return showToast("Tổng tiền phải là một số không âm.", "error");
        
        try {
            const tx = createTransaction('orders', 'readwrite');
            const store = tx.objectStore('orders');
            let orderData;
            if (orderId) { 
                const existingOrder = await promisifyRequest(store.get(orderId)); 
                orderData = { ...existingOrder, total: totalValue };
                log(`Người dùng cập nhật đơn hàng #${orderData.orderCode || orderId}.`, 'info');
            } else { 
                // === CẢI TIẾN: Thêm orderCode khi tạo đơn hàng mới ===
                orderData = { 
                    orderCode: generateOrderCode(),
                    total: totalValue, 
                    status: 'pending_approval', 
                    date: new Date().getTime(), 
                    username: loggedInUser, 
                    requestedStatus: null 
                }; 
                log(`Người dùng tạo đơn hàng mới #${orderData.orderCode}.`, 'success');
            }
            const putRequest = store.put(orderData);
            putRequest.onsuccess = (e) => {
                const savedId = e.target.result;
                loadInitialData();
                closeModal(orderModal);
                orderForm.reset();
                showToast(orderId ? `Đã cập nhật đơn hàng #${orderData.orderCode}` : `Đã thêm đơn hàng #${orderData.orderCode}`, 'success');
            }
        } catch (error) { 
            showToast('Lỗi khi lưu đơn hàng.', 'error');
            log(`Lỗi khi lưu đơn hàng: ${error.message}`, 'error');
        }
    }
    
    async function handleEditOrder(orderId) {
        try {
            const order = await promisifyRequest(createTransaction('orders', 'readonly').objectStore('orders').get(orderId));
            if (order) {
                if (order.status !== 'pending_approval') { 
                    const msg = `Không thể sửa đơn hàng #${order.orderCode || orderId} đã được xử lý.`;
                    log(msg, 'error');
                    return showToast(msg, 'error'); 
                }
                log(`Bắt đầu sửa đơn hàng #${order.orderCode || orderId}.`, 'info');
                orderForm['order-id'].value = order.id;
                orderForm['order-total'].value = order.total;
                document.getElementById('order-modal-title').textContent = `Sửa đơn hàng #${order.orderCode || order.id}`;
                openModal(orderModal);
            }
        } catch (error) { 
            log(`Lỗi khi tìm đơn hàng #${orderId} để sửa: ${error.message}`, 'error');
            showToast('Không thể tìm thấy đơn hàng.', 'error'); 
        }
    }

    function handleCancellationRequest(orderId) {
        showConfirmModal('Bạn có chắc muốn gửi yêu cầu hủy cho đơn hàng này?', async (confirmed) => {
            if (confirmed) {
                try {
                    const tx = createTransaction('orders', 'readwrite');
                    const store = tx.objectStore('orders');
                    const order = await promisifyRequest(store.get(orderId));
                    if (order) {
                        order.requestedStatus = 'cancelled';
                        await promisifyRequest(store.put(order));
                        const msg = `Đã gửi yêu cầu hủy cho đơn hàng #${order.orderCode || orderId}.`;
                        log(msg, 'info');
                        showToast('Đã gửi yêu cầu hủy. Vui lòng chờ Admin phê duyệt.', 'success');
                        await loadInitialData();
                    }
                } catch (error) {
                    log(`Lỗi khi gửi yêu cầu hủy đơn #${orderId}: ${error.message}`, 'error');
                    showToast('Có lỗi xảy ra khi gửi yêu cầu.', 'error'); 
                }
            } else {
                log(`Người dùng đã hủy thao tác yêu cầu hủy đơn #${orderId}.`, 'info');
            }
        }, true);
    }

    async function handleDeleteOrder(orderId) {
        try {
            const order = await promisifyRequest(createTransaction('orders', 'readonly').objectStore('orders').get(orderId));
            if (order && order.status !== 'pending_approval') {
                const msg = `Không thể xóa đơn hàng #${order.orderCode || orderId} đã được xử lý.`;
                log(msg, 'error');
                return showToast(msg, 'error');
            }
            showConfirmModal(`Bạn có chắc muốn xóa đơn hàng #${order.orderCode || orderId}?`, async (confirmed) => {
                if(confirmed){
                    try {
                        await promisifyRequest(createTransaction('orders', 'readwrite').objectStore('orders').delete(orderId));
                        const msg = `Đã xóa đơn hàng #${order.orderCode || orderId}.`;
                        log(msg, 'success');
                        showToast(msg, 'success');
                        await loadInitialData();
                    } catch (error) {
                        log(`Lỗi khi xóa đơn hàng #${orderId}: ${error.message}`, 'error');
                        showToast('Lỗi khi xóa đơn hàng.', 'error'); 
                    }
                } else {
                    log(`Người dùng đã hủy thao tác xóa đơn #${orderId}.`, 'info');
                }
            }, true);
        } catch (error) {
            log(`Lỗi khi kiểm tra đơn hàng #${orderId} để xóa: ${error.message}`, 'error');
        }
    }
    
    // --- EVENT LISTENERS SETUP ---
    function setupEventListeners() {
        menuItems.forEach(item => { item.addEventListener('click', (e) => { e.preventDefault(); menuItems.forEach(i => i.classList.remove('active')); contentSections.forEach(s => s.classList.remove('active')); item.classList.add('active'); const sectionId = item.id.replace('-link', '-section'); const targetSection = document.getElementById(sectionId); if (targetSection) { targetSection.classList.add('active'); mainTitle.textContent = item.querySelector('span').textContent; } document.body.classList.remove('sidebar-visible'); }); });
        
        themeToggleCheckbox.addEventListener('change', () => setTheme(themeToggleCheckbox.checked ? 'dark' : 'light'));
        logoutBtn.addEventListener('click', (e) => { e.preventDefault(); showConfirmModal('Bạn có chắc chắn muốn đăng xuất?', (confirmed) => { if(confirmed) { log('Người dùng đăng xuất.', 'info'); sessionStorage.removeItem('loggedInUser'); showToast('Đang đăng xuất...', 'info'); setTimeout(() => window.location.href = 'login.html', 1000); } }); });
        document.getElementById('add-order-btn').addEventListener('click', () => { log('Mở cửa sổ thêm đơn hàng mới.', 'info'); orderForm.reset(); orderForm['order-id'].value = ''; document.getElementById('order-modal-title').textContent = 'Thêm đơn hàng mới'; openModal(orderModal); });
        document.getElementById('close-order-modal-btn').addEventListener('click', () => closeModal(orderModal));
        orderModal.addEventListener('click', (e) => { if (e.target === orderModal) closeModal(orderModal); });
        orderForm.addEventListener('submit', handleOrderFormSubmit);
        ordersTableBody.addEventListener('click', (event) => {
            const button = event.target.closest('button.table-action-btn');
            if (!button) return;
            const orderId = parseInt(button.closest('tr').dataset.orderId);
            if (button.classList.contains('edit-btn')) handleEditOrder(orderId);
            else if (button.classList.contains('delete-btn')) handleDeleteOrder(orderId);
            else if (button.classList.contains('request-cancel-btn')) handleCancellationRequest(orderId);
        });
        document.getElementById('toggle-log-btn').addEventListener('click', () => logConsole.classList.toggle('collapsed'));
        document.getElementById('clear-log-btn').addEventListener('click', () => { logContent.innerHTML = ''; log('Log đã được xóa.', 'info'); });
        document.querySelector('.log-filters').addEventListener('click', (e) => { if (e.target.classList.contains('filter-btn')) { const filter = e.target.dataset.filter; document.querySelectorAll('.log-filters .filter-btn').forEach(btn => btn.classList.remove('active')); e.target.classList.add('active'); document.querySelectorAll('.log-entry').forEach(entry => { entry.style.display = (filter === 'all' || entry.dataset.logType === filter) ? 'flex' : 'none'; }); } });
    }

    function setTheme(theme) {
        document.body.classList.toggle('dark-theme', theme === 'dark');
        localStorage.setItem('theme', theme);
        themeToggleCheckbox.checked = (theme === 'dark');
        log(`Giao diện đã đổi sang chế độ: ${theme}`, 'info');
    }

    setupDatabase();
    setupEventListeners();
    setTheme(localStorage.getItem('theme') || 'light');
});