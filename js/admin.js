document.addEventListener('DOMContentLoaded', () => {
    // --- BẢO MẬT TRANG ADMIN ---
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (loggedInUser !== 'admin') {
        alert('Bạn không có quyền truy cập trang này.');
        window.location.href = 'login.html';
        return;
    }

    // --- TIỆN ÍCH MÃ HÓA (ĐƯỢC THÊM VÀO ĐỂ TƯƠNG THÍCH) ---
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // --- DOM Elements ---
    const sidebarLinks = document.querySelectorAll('.sidebar-menu .menu-item');
    const contentSections = document.querySelectorAll('.content-section');
    const mainTitle = document.getElementById('main-title');
    const logoutBtn = document.getElementById('logout-btn');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    const totalUsersCard = document.getElementById('total-users-card');
    const totalOrdersCard = document.getElementById('total-orders-card');
    const monthlyRevenueCard = document.getElementById('monthly-revenue-card');
    const usersTableBody = document.getElementById('users-table-body');
    const userSearchInput = document.getElementById('user-search-input');
    const ordersTableBody = document.getElementById('orders-table-body');
    const requestsTableBody = document.getElementById('requests-table-body');
    const themeToggle = document.getElementById('theme-toggle-checkbox');
    const deleteAllDataBtn = document.getElementById('delete-all-data-btn');
    const modalContainer = document.getElementById('modal-container');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const notificationContainer = document.getElementById('notification-container');

    // --- State ---
    let db;
    let allUsers = [];
    let filteredUsers = [];
    let currentPage = 1;
    const rowsPerPage = 8;
    const statusMap = {
        pending_approval: { text: "Chờ phê duyệt", class: "pending-approval" },
        pending: { text: "Đang chờ xử lý", class: "pending" },
        processing: { text: "Đang xử lý", class: "processing" },
        transferred: { text: "Chuyển đối tác", class: "transferred" },
        shipped: { text: "Đang giao hàng", class: "shipped" },
        completed: { text: "Hoàn thành", class: "completed" },
        cancelled: { text: "Đã bị hủy", class: "cancelled" }
    };

    // --- INITIALIZATION ---
    setupDatabase();
    setupEventListeners();
    applyInitialTheme();

    // --- DATABASE SETUP ---
    function setupDatabase() {
        const request = indexedDB.open('userAuthDB', 2);
        request.onerror = (event) => console.error("Database error:", event.target.errorCode);
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains('credentials')) db.createObjectStore('credentials', { keyPath: 'username' });
            if (!db.objectStoreNames.contains('orders')) {
                const orderStore = db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
                orderStore.createIndex('by_username', 'username', { unique: false });
            }
            if (!db.objectStoreNames.contains('passwordRequests')) {
                const requestStore = db.createObjectStore('passwordRequests', { keyPath: 'id', autoIncrement: true });
                requestStore.createIndex('by_username', 'username', { unique: true });
            }
        };
        request.onsuccess = (event) => {
            db = event.target.result;
            loadInitialData();
        };
    }

    function loadInitialData() {
        loadAllUsers();
        loadAllOrders();
        loadPasswordRequests();
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.id.replace('-link', '-section');
                sidebarLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                contentSections.forEach(section => {
                    section.classList.remove('active');
                    if (section.id === targetId) {
                        section.classList.add('active');
                        mainTitle.textContent = link.querySelector('span').textContent;
                    }
                });
                if (window.innerWidth <= 768) document.body.classList.remove('sidebar-visible');
            });
        });

        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('loggedInUser');
            window.location.href = 'login.html';
        });

        menuToggle.addEventListener('click', () => document.body.classList.add('sidebar-visible'));
        sidebarOverlay.addEventListener('click', () => document.body.classList.remove('sidebar-visible'));

        userSearchInput.addEventListener('input', () => {
            const searchTerm = userSearchInput.value.toLowerCase();
            filteredUsers = allUsers.filter(user => user.username.toLowerCase().includes(searchTerm));
            currentPage = 1;
            displayUsers();
        });

        usersTableBody.addEventListener('click', handleUserAction);
        ordersTableBody.addEventListener('click', handleOrderAction);
        requestsTableBody.addEventListener('click', handleRequestAction);

        themeToggle.addEventListener('change', toggleTheme);
        deleteAllDataBtn.addEventListener('click', () => {
            showConfirmationModal(
                'Xác nhận Xóa Dữ liệu',
                'Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu người dùng, đơn hàng và yêu cầu không? Hành động này không thể hoàn tác.',
                () => {
                    clearAllData();
                    showNotification('Đã xóa sạch toàn bộ dữ liệu.', 'success');
                }
            );
        });

        modalCloseBtn.addEventListener('click', closeModal);
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) closeModal();
        });
    }

    // --- UI & THEME ---
    function applyInitialTheme() {
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        themeToggle.checked = isDarkMode;
        if (isDarkMode) document.body.classList.add('dark-theme');
    }

    function toggleTheme() {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('darkMode', themeToggle.checked);
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notificationContainer.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.5s ease forwards';
            notification.addEventListener('animationend', () => notification.remove());
        }, 3000);
    }

    function openModal(title, contentHTML) {
        modalTitle.textContent = title;
        modalBody.innerHTML = contentHTML;
        modalContainer.classList.remove('modal-hidden');
    }

    function closeModal() {
        modalContainer.classList.add('modal-hidden');
    }

    function showConfirmationModal(title, message, onConfirm) {
        const content = `<p>${message}</p><div class="modal-actions"><button id="confirm-cancel" class="btn-secondary">Hủy bỏ</button><button id="confirm-ok">Xác nhận</button></div>`;
        openModal(title, content);
        document.getElementById('confirm-ok').onclick = () => {
            onConfirm();
            closeModal();
        };
        document.getElementById('confirm-cancel').onclick = closeModal;
    }

    // --- DATA LOADING & DISPLAY ---
    function loadAllUsers() {
        if (!db) return;
        const transaction = db.transaction(['credentials'], 'readonly');
        const store = transaction.objectStore('credentials');
        store.getAll().onsuccess = (e) => {
            allUsers = e.target.result.filter(user => user.username !== 'admin');
            filteredUsers = [...allUsers];
            totalUsersCard.textContent = allUsers.length;
            currentPage = 1;
            displayUsers();
        };
    }

    function displayUsers() {
        usersTableBody.innerHTML = '';
        if (filteredUsers.length === 0) {
            usersTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center;">Không tìm thấy người dùng nào.</td></tr>`;
            const paginationContainer = document.querySelector('#user-management-section .pagination-container');
            if(paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        const startIndex = (currentPage - 1) * rowsPerPage;
        const paginatedUsers = filteredUsers.slice(startIndex, startIndex + rowsPerPage);

        paginatedUsers.forEach(user => {
            const row = document.createElement('tr');
            // ## SỬA LỖI 1: Kiểm tra 'user.status' thay vì 'user.locked'
            const isLocked = user.status === 'locked';
            const userStatus = isLocked ? 'Bị khóa' : 'Hoạt động';
            const lockIcon = isLocked ? 'bxs-lock' : 'bxs-lock-open';
            const lockTitle = isLocked ? 'Mở khóa' : 'Khóa';
            const lockClass = isLocked ? 'unlock-btn' : 'lock-btn';
            const statusClass = isLocked ? 'cancelled' : 'active';

            row.innerHTML = `
                <td>${user.username}</td>
                <td><span class="status ${statusClass}">${userStatus}</span></td>
                <td>
                    <div class="action-btn-group">
                        <button class="table-action-btn reset-password-btn" data-username="${user.username}" title="Reset Mật khẩu"><i class='bx bx-key'></i></button>
                        <button class="table-action-btn ${lockClass}" data-username="${user.username}" title="${lockTitle}"><i class='bx ${lockIcon}'></i></button>
                        <button class="table-action-btn delete-user-btn" data-username="${user.username}" title="Xóa Người dùng"><i class='bx bxs-trash'></i></button>
                    </div>
                </td>
            `;
            usersTableBody.appendChild(row);
        });

        renderPagination(filteredUsers.length, document.querySelector('#user-management-section .pagination-container'));
    }

    function renderPagination(totalItems, container) {
        if (!container) return;
        const totalPages = Math.ceil(totalItems / rowsPerPage);
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = `<button id="prev-page" class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''}>Trước</button><span id="page-info">Trang ${currentPage} / ${totalPages}</span><button id="next-page" class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''}>Sau</button>`;
        document.getElementById('prev-page').onclick = () => { if (currentPage > 1) { currentPage--; displayUsers(); } };
        document.getElementById('next-page').onclick = () => { if (currentPage < totalPages) { currentPage++; displayUsers(); } };
    }

    function loadAllOrders() {
        if (!db || !db.objectStoreNames.contains('orders')) return;
        const transaction = db.transaction('orders', 'readonly');
        const store = transaction.objectStore('orders');
        store.getAll().onsuccess = (e) => {
            let orders = e.target.result.sort((a, b) => b.id - a.id);
            displayOrders(orders);
            totalOrdersCard.textContent = orders.length;
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            const monthlyRevenue = orders.filter(o => o.date >= startOfMonth && o.status === 'completed').reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
            monthlyRevenueCard.textContent = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(monthlyRevenue);
        };
    }

    function displayOrders(orders) {
        ordersTableBody.innerHTML = orders && orders.length > 0 ? orders.map(createOrderRowHTML).join('') : `<tr><td colspan="6" style="text-align: center;">Không có đơn hàng nào.</td></tr>`;
    }

    function createOrderRowHTML(order) {
        const statusInfo = statusMap[order.status] || { text: order.status, class: "" };
        let statusDisplayHTML = `<span class="status ${statusInfo.class}">${statusInfo.text}</span>`;
        let actionsHTML = 'Đã kết thúc';
        let rowClass = '';
        if (order.requestedStatus) {
            statusDisplayHTML += `<br><span class="status-change-request">↳ Yêu cầu: ${statusMap[order.requestedStatus]?.text || ''}</span>`;
            actionsHTML = `<div class="action-btn-group"><button class="table-action-btn approve-change-btn" data-order-id="${order.id}" title="Duyệt"><i class='bx bx-check-double'></i></button><button class="table-action-btn reject-change-btn" data-order-id="${order.id}" title="Từ chối"><i class='bx bx-x'></i></button></div>`;
            rowClass = 'has-request';
        } else if (order.status === 'pending_approval') {
            actionsHTML = `<div class="action-btn-group"><button class="table-action-btn approve-btn" data-order-id="${order.id}" title="Phê duyệt"><i class='bx bx-check-shield'></i></button><button class="table-action-btn reject-btn" data-order-id="${order.id}" title="Từ chối"><i class='bx bx-x-circle'></i></button></div>`;
        } else if (!['completed', 'cancelled'].includes(order.status)) {
            actionsHTML = `<div class="action-btn-group"><button class="table-action-btn update-status-btn" data-order-id="${order.id}" title="Cập nhật"><i class='bx bxs-edit-alt'></i></button></div>`;
        }
        return `<tr class="${rowClass}" data-order-id="${order.id}"><td>#${order.orderCode || order.id}</td><td>${order.username}</td><td>${new Date(order.date).toLocaleDateString('vi-VN')}</td><td>${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total)}</td><td>${statusDisplayHTML}</td><td>${actionsHTML}</td></tr>`;
    }

    function loadPasswordRequests() {
        if (!db || !db.objectStoreNames.contains('passwordRequests')) return;
        const transaction = db.transaction(['passwordRequests'], 'readonly');
        const store = transaction.objectStore('passwordRequests');
        store.getAll().onsuccess = (e) => { displayPasswordRequests(e.target.result); };
    }

    function displayPasswordRequests(requests) {
        requestsTableBody.innerHTML = '';
        if (!requests || requests.length === 0) {
            requestsTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Không có yêu cầu nào.</td></tr>`;
            return;
        }
        requests.forEach(req => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${req.username}</td><td>${new Date(req.timestamp).toLocaleString('vi-VN')}</td><td><span class="status pending">Đang chờ</span></td><td><div class="action-btn-group"><button class="table-action-btn approve-request-btn" data-username="${req.username}" title="Phê duyệt"><i class='bx bx-check'></i></button><button class="table-action-btn reject-request-btn" data-username="${req.username}" title="Từ chối"><i class='bx bx-x'></i></button></div></td>`;
            requestsTableBody.appendChild(row);
        });
    }

    // --- ACTION HANDLERS ---
    function handleUserAction(e) {
        const button = e.target.closest('.table-action-btn');
        if (!button) return;
        const username = button.dataset.username;

        if (button.classList.contains('reset-password-btn')) {
            showConfirmationModal('Reset Mật khẩu', `Bạn có chắc muốn đặt lại mật khẩu cho ${username}? Mật khẩu mới sẽ là "123456".`, () => resetUserPassword(username));
        } else if (button.classList.contains('lock-btn') || button.classList.contains('unlock-btn')) {
            toggleUserLock(username);
        } else if (button.classList.contains('delete-user-btn')) {
            showConfirmationModal('Xóa Người dùng', `Bạn có chắc muốn xóa vĩnh viễn người dùng ${username}? Mọi đơn hàng của họ cũng sẽ bị xóa.`, () => deleteUser(username));
        }
    }

    function handleOrderAction(e) {
        const button = e.target.closest('.table-action-btn');
        if (!button) return;
        const orderId = parseInt(button.dataset.orderId, 10);
        if (button.classList.contains('approve-btn')) updateOrderStatus(orderId, 'pending');
        else if (button.classList.contains('reject-btn')) updateOrderStatus(orderId, 'cancelled', true);
        else if (button.classList.contains('update-status-btn')) showUpdateStatusModal(orderId);
        else if (button.classList.contains('approve-change-btn')) approveStatusChange(orderId);
        else if (button.classList.contains('reject-change-btn')) rejectStatusChange(orderId);
    }

    function handleRequestAction(e) {
        const button = e.target.closest('.table-action-btn');
        if (!button) return;
        const username = button.dataset.username;
        if (button.classList.contains('approve-request-btn')) {
            showConfirmationModal('Phê duyệt Yêu cầu', `Đặt lại mật khẩu của ${username} thành "123456"?`, () => {
                resetUserPassword(username);
                deletePasswordRequest(username, 'Yêu cầu reset mật khẩu đã được phê duyệt.');
            });
        } else if (button.classList.contains('reject-request-btn')) {
            showConfirmationModal('Từ chối Yêu cầu', `Từ chối yêu cầu reset mật khẩu của ${username}?`, () => {
                deletePasswordRequest(username, 'Yêu cầu reset mật khẩu đã bị từ chối.', 'error');
            });
        }
    }

    // --- DATABASE ACTIONS ---
    async function resetUserPassword(username) { // ## SỬA LỖI 2.1: Thêm 'async'
        const transaction = db.transaction(['credentials'], 'readwrite');
        const store = transaction.objectStore('credentials');
        const request = store.get(username);
        request.onsuccess = async () => { // ## SỬA LỖI 2.2: Thêm 'async'
            const user = request.result;
            if (user) {
                // ## SỬA LỖI 2.3: Mã hóa mật khẩu mới với 'salt' của người dùng
                if (!user.salt) {
                    showNotification(`Lỗi: Không tìm thấy salt cho người dùng ${username}.`, 'error');
                    return;
                }
                user.passwordHash = await hashPassword('123456' + user.salt);
                
                // Xóa thuộc tính 'password' cũ không còn dùng đến để dọn dẹp
                delete user.password; 
                
                store.put(user);
                showNotification(`Đã reset mật khẩu cho ${username}.`, 'success');
            }
        };
    }

    function toggleUserLock(username) {
        const transaction = db.transaction(['credentials'], 'readwrite');
        const store = transaction.objectStore('credentials');
        const request = store.get(username);
        request.onsuccess = () => {
            const user = request.result;
            if (user) {
                // ## SỬA LỖI 1: Thay đổi 'user.status' thay vì 'user.locked'
                user.status = user.status === 'locked' ? 'active' : 'locked';
                store.put(user);
                showNotification(`Đã ${user.status === 'locked' ? 'khóa' : 'mở khóa'} tài khoản ${username}.`, 'success');
                loadAllUsers();
            }
        };
    }

    function deleteUser(username) {
        const tx = db.transaction(['credentials', 'orders'], 'readwrite');
        tx.objectStore('credentials').delete(username);
        const orderStore = tx.objectStore('orders');
        const userIndex = orderStore.index('by_username');
        userIndex.openCursor(IDBKeyRange.only(username)).onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
        tx.oncomplete = () => {
            showNotification(`Đã xóa người dùng ${username} và các đơn hàng liên quan.`, 'success');
            loadInitialData();
        };
    }

    function showUpdateStatusModal(orderId) {
        const transaction = db.transaction('orders', 'readonly');
        const store = transaction.objectStore('orders');
        store.get(orderId).onsuccess = (e) => {
            const order = e.target.result;
            if (!order) return;
            const displayId = order.orderCode || order.id;
            let optionsHTML = Object.keys(statusMap).filter(key => key !== 'pending_approval').map(key => `<option value="${key}" ${order.status === key ? 'selected' : ''}>${statusMap[key].text}</option>`).join('');
            const modalContent = `<p>Chọn trạng thái mới cho đơn hàng <strong>#${displayId}</strong>:</p><select id="new-status-select">${optionsHTML}</select><div class="modal-actions"><button id="confirm-cancel" class="btn-secondary">Hủy</button><button id="confirm-ok">Lưu</button></div>`;
            openModal(`Cập nhật trạng thái #${displayId}`, modalContent);
            document.getElementById('confirm-ok').onclick = () => {
                updateOrderStatus(orderId, document.getElementById('new-status-select').value);
                closeModal();
            };
            document.getElementById('confirm-cancel').onclick = closeModal;
        }
    }

    function updateOrderStatus(orderId, newStatus, isRejectingApproval = false) {
        const transaction = db.transaction(['orders'], 'readwrite');
        const store = transaction.objectStore('orders');
        store.get(orderId).onsuccess = (e) => {
            const order = e.target.result;
            if (order) {
                order.status = newStatus;
                delete order.requestedStatus;
                store.put(order);
            }
        };
        transaction.oncomplete = () => {
            const message = isRejectingApproval ? `Đã từ chối đơn hàng #${orderId}.` : `Đã cập nhật trạng thái đơn hàng #${orderId}.`;
            showNotification(message, 'success');
            loadAllOrders();
        };
    }

    function approveStatusChange(orderId) {
        const transaction = db.transaction(['orders'], 'readwrite');
        const store = transaction.objectStore('orders');
        store.get(orderId).onsuccess = (e) => {
            const order = e.target.result;
            if (order && order.requestedStatus) {
                order.status = order.requestedStatus;
                delete order.requestedStatus;
                store.put(order);
            }
        };
        transaction.oncomplete = () => {
            showNotification(`Đã duyệt yêu cầu thay đổi trạng thái cho đơn #${orderId}.`, 'success');
            loadAllOrders();
        };
    }

    function rejectStatusChange(orderId) {
        const transaction = db.transaction(['orders'], 'readwrite');
        const store = transaction.objectStore('orders');
        store.get(orderId).onsuccess = (e) => {
            const order = e.target.result;
            if (order) {
                delete order.requestedStatus;
                store.put(order);
            }
        };
        transaction.oncomplete = () => {
            showNotification(`Đã từ chối yêu cầu thay đổi trạng thái cho đơn #${orderId}.`, 'error');
            loadAllOrders();
        };
    }

    function deletePasswordRequest(username, message, type = 'success') {
        const transaction = db.transaction(['passwordRequests'], 'readwrite');
        const store = transaction.objectStore('passwordRequests');
        const index = store.index('by_username');
        index.get(username).onsuccess = (e) => {
            if (e.target.result) store.delete(e.target.result.id);
        };
        transaction.oncomplete = () => {
            showNotification(message, type);
            loadPasswordRequests();
        };
    }

    function clearAllData() {
        const transaction = db.transaction(['credentials', 'orders', 'passwordRequests'], 'readwrite');
        transaction.objectStore('credentials').clear();
        transaction.objectStore('orders').clear();
        transaction.objectStore('passwordRequests').clear();
        transaction.oncomplete = () => {
            loadInitialData();
        };
    }
});