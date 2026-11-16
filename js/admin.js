const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbyIRv7GM8fCvBPYuqfrutKB12W_DJEU644AMaTs7ERttzBvypWGReVp-KlFTYnhrsaA6A/exec';

document.addEventListener('DOMContentLoaded', () => {
    // --- BẢO MẬT TRANG ADMIN ---
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (loggedInUser !== 'admin') {
        alert('Bạn không có quyền truy cập trang này.');
        window.location.href = 'login.html';
        return;
    }

    // --- TIỆN ÍCH MÃ HÓA & GỌI API ---
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function callSheetAPI(payload) {
        const response = await fetch(SHEET_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Lỗi kết nối đến máy chủ Google Sheets.');
        return await response.json();
    }

    // --- DOM Elements ---
    const sidebarLinks = document.querySelectorAll('.sidebar-menu .menu-item');
    const contentSections = document.querySelectorAll('.content-section');
    const mainTitle = document.getElementById('main-title');
    const logoutBtn = document.getElementById('logout-btn');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const adminProfileLink = document.getElementById('admin-profile-link');

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
    let allUsers = [];
    let filteredUsers = [];
    let allOrders = [];
    let allRequests = [];
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
    setupEventListeners();
    applyInitialTheme();
    loadInitialData();

    async function loadInitialData() {
        usersTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center;">Đang tải dữ liệu...</td></tr>`;
        ordersTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Đang tải dữ liệu...</td></tr>`;
        requestsTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Đang tải dữ liệu...</td></tr>`;

        try {
            const res = await callSheetAPI({ action: 'adminGetAllData' });
            if (!res.success) throw new Error(res.message);

            allUsers = (res.users || []).filter(user => user.username.toLowerCase() !== 'admin');
            filteredUsers = [...allUsers];
            totalUsersCard.textContent = allUsers.length;
            currentPage = 1;
            displayUsers();

            allOrders = (res.orders || []).sort((a, b) => b.id - a.id);
            displayOrders(allOrders);
            totalOrdersCard.textContent = allOrders.length;

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            const monthlyRevenue = allOrders
                .filter(o => new Date(o.date).getTime() >= startOfMonth && o.status === 'completed')
                .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
            monthlyRevenueCard.textContent = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(monthlyRevenue);

            allRequests = res.passwordRequests || [];
            displayPasswordRequests(allRequests);
        } catch (error) {
            showNotification('Lỗi đồng bộ dữ liệu: ' + error.message, 'error');
        }
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

        if (adminProfileLink) {
            adminProfileLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'user.html';
            });
        }

        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
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
                'Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu người dùng, đơn hàng và yêu cầu trên Google Sheets không? Hành động này không thể hoàn tác.',
                async () => {
                    await clearAllData();
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
        document.getElementById('confirm-ok').onclick = async () => {
            closeModal();
            await onConfirm();
        };
        document.getElementById('confirm-cancel').onclick = closeModal;
    }

    // --- DISPLAY FUNCTIONS ---
    function displayUsers() {
        usersTableBody.innerHTML = '';
        if (filteredUsers.length === 0) {
            usersTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center;">Không tìm thấy người dùng nào.</td></tr>`;
            const paginationContainer = document.querySelector('#user-management-section .pagination-container');
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        const startIndex = (currentPage - 1) * rowsPerPage;
        const paginatedUsers = filteredUsers.slice(startIndex, startIndex + rowsPerPage);

        paginatedUsers.forEach(user => {
            const row = document.createElement('tr');
            const isLocked = user.locked === true || String(user.locked).toLowerCase() === 'true';
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

    function displayOrders(orders) {
        ordersTableBody.innerHTML = orders && orders.length > 0
            ? orders.map(createOrderRowHTML).join('')
            : `<tr><td colspan="6" style="text-align: center;">Không có đơn hàng nào.</td></tr>`;
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

    function displayPasswordRequests(requests) {
        requestsTableBody.innerHTML = '';
        const pendingRequests = (requests || []).filter(r => String(r.status).toLowerCase() === 'pending');
        if (pendingRequests.length === 0) {
            requestsTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Không có yêu cầu nào.</td></tr>`;
            return;
        }
        pendingRequests.forEach(req => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${req.username}</td><td>${new Date(req.requestedAt).toLocaleString('vi-VN')}</td><td><span class="status pending">Đang chờ</span></td><td><div class="action-btn-group"><button class="table-action-btn approve-request-btn" data-username="${req.username}" title="Phê duyệt"><i class='bx bx-check'></i></button><button class="table-action-btn reject-request-btn" data-username="${req.username}" title="Từ chối"><i class='bx bx-x'></i></button></div></td>`;
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
        const orderId = Number(button.dataset.orderId);
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
            showConfirmationModal('Phê duyệt Yêu cầu', `Đặt lại mật khẩu của ${username} thành "123456"?`, async () => {
                const ok = await resetUserPassword(username, true);
                if (ok) await resolvePasswordRequest(username, 'approved', 'Yêu cầu reset mật khẩu đã được phê duyệt.');
            });
        } else if (button.classList.contains('reject-request-btn')) {
            showConfirmationModal('Từ chối Yêu cầu', `Từ chối yêu cầu reset mật khẩu của ${username}?`, async () => {
                await resolvePasswordRequest(username, 'rejected', 'Yêu cầu reset mật khẩu đã bị từ chối.', 'error');
            });
        }
    }

    // --- GOOGLE SHEETS API ACTIONS ---
    async function resetUserPassword(username, silent = false) {
        try {
            const user = allUsers.find(u => u.username === username);
            if (!user || !user.salt) {
                showNotification(`Lỗi: Không tìm thấy salt cho người dùng ${username}.`, 'error');
                return false;
            }
            const newPasswordHash = await hashPassword('123456' + user.salt);
            const res = await callSheetAPI({
                action: 'adminResetPassword',
                username: username,
                newPasswordHash: newPasswordHash
            });
            if (!res.success) throw new Error(res.message);
            if (!silent) showNotification(`Đã reset mật khẩu cho ${username} thành "123456".`, 'success');
            return true;
        } catch (error) {
            showNotification(error.message, 'error');
            return false;
        }
    }

    async function toggleUserLock(username) {
        try {
            const res = await callSheetAPI({ action: 'adminToggleUserLock', username: username });
            if (!res.success) throw new Error(res.message);
            showNotification(`Đã ${res.locked ? 'khóa' : 'mở khóa'} tài khoản ${username}.`, 'success');
            await loadInitialData();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async function deleteUser(username) {
        try {
            const res = await callSheetAPI({ action: 'adminDeleteUser', username: username });
            if (!res.success) throw new Error(res.message);
            showNotification(`Đã xóa người dùng ${username} và các đơn hàng liên quan.`, 'success');
            await loadInitialData();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    function showUpdateStatusModal(orderId) {
        const order = allOrders.find(o => o.id === orderId);
        if (!order) return;
        const displayId = order.orderCode || order.id;
        const optionsHTML = Object.keys(statusMap)
            .filter(key => key !== 'pending_approval')
            .map(key => `<option value="${key}" ${order.status === key ? 'selected' : ''}>${statusMap[key].text}</option>`)
            .join('');
        const modalContent = `<p>Chọn trạng thái mới cho đơn hàng <strong>#${displayId}</strong>:</p><div class="custom-select-wrapper"><select id="new-status-select">${optionsHTML}</select></div><div class="modal-actions"><button id="confirm-cancel" class="btn-secondary">Hủy</button><button id="confirm-ok">Lưu</button></div>`;
        openModal(`Cập nhật trạng thái #${displayId}`, modalContent);
        document.getElementById('confirm-ok').onclick = async () => {
            const newStatus = document.getElementById('new-status-select').value;
            closeModal();
            await updateOrderStatus(orderId, newStatus);
        };
        document.getElementById('confirm-cancel').onclick = closeModal;
    }

    async function updateOrderStatus(orderId, newStatus, isRejectingApproval = false) {
        try {
            const res = await callSheetAPI({
                action: 'adminUpdateOrder',
                orderId: orderId,
                mode: 'setStatus',
                newStatus: newStatus
            });
            if (!res.success) throw new Error(res.message);
            const message = isRejectingApproval ? `Đã từ chối đơn hàng #${res.orderCode || orderId}.` : `Đã cập nhật trạng thái đơn hàng #${res.orderCode || orderId}.`;
            showNotification(message, 'success');
            await loadInitialData();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async function approveStatusChange(orderId) {
        try {
            const res = await callSheetAPI({
                action: 'adminUpdateOrder',
                orderId: orderId,
                mode: 'approveRequest'
            });
            if (!res.success) throw new Error(res.message);
            showNotification(`Đã duyệt yêu cầu thay đổi trạng thái cho đơn #${res.orderCode || orderId}.`, 'success');
            await loadInitialData();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async function rejectStatusChange(orderId) {
        try {
            const res = await callSheetAPI({
                action: 'adminUpdateOrder',
                orderId: orderId,
                mode: 'rejectRequest'
            });
            if (!res.success) throw new Error(res.message);
            showNotification(`Đã từ chối yêu cầu thay đổi trạng thái cho đơn #${res.orderCode || orderId}.`, 'error');
            await loadInitialData();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async function resolvePasswordRequest(username, resolution, message, type = 'success') {
        try {
            const res = await callSheetAPI({
                action: 'adminResolvePasswordRequest',
                username: username,
                resolution: resolution
            });
            if (!res.success) throw new Error(res.message);
            showNotification(message, type);
            await loadInitialData();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async function clearAllData() {
        try {
            const res = await callSheetAPI({ action: 'adminClearAllData' });
            if (!res.success) throw new Error(res.message);
            showNotification('Đã xóa sạch toàn bộ dữ liệu trên Google Sheets.', 'success');
            await loadInitialData();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
});