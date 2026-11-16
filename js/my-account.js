// Lưu ý: Đảm bảo SHEET_API_URL này trùng khớp với URL Web App mới nhất của file code.gs đã có tab ServiceOrders
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbyIRv7GM8fCvBPYuqfrutKB12W_DJEU644AMaTs7ERttzBvypWGReVp-KlFTYnhrsaA6A/exec';
const SERVICE_SHEET_ID = '1zZHBKcIDd8a1FIiYaikRYiDZV-UfWZry1p0UPSyEnvA';
const SERVICE_SHEET_NAME = 'ServiceOrders';

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & CONSTANTS ---
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    let userOrders = [];
    let currentLookedUpOrder = null;
    let isSavingOrder = false;

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
    const orderCodeInput = document.getElementById('order-code-input');
    const lookupOrderBtn = document.getElementById('lookup-order-btn');
    const orderPreviewBox = document.getElementById('order-preview-box');
    const orderPreviewDetails = document.getElementById('order-preview-details');
    const saveOrderBtn = document.getElementById('save-order-btn');

    const orderDetailModal = document.getElementById('order-detail-modal');
    const detailModalTitle = document.getElementById('detail-modal-title');
    const orderFullDetails = document.getElementById('order-full-details');

    const confirmModal = document.getElementById('confirm-modal');
    const logConsole = document.getElementById('log-console');
    const logContent = document.getElementById('log-content');

    // --- INITIALIZATION ---
    if (!loggedInUser) {
        alert("Vui lòng đăng nhập để tiếp tục.");
        window.location.href = 'login.html';
        return;
    }

    async function callSheetAPI(payload) {
        const response = await fetch(SHEET_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const rawText = await response.text();
        try {
            return JSON.parse(rawText);
        } catch (err) {
            throw new Error('Server trả về dữ liệu không phải JSON (Kiểm tra lại URL Deploy Apps Script): ' + rawText.slice(0, 120));
        }
    }

    // Đọc trực tiếp dữ liệu đơn hàng từ tab ServiceOrders thông qua Apps Script API
    async function fetchOrderFromServiceSheet(orderCode) {
        const cleanCode = String(orderCode || '').trim().replace(/^#/, '').toUpperCase();

        // 1. Ưu tiên gọi qua Apps Script (đọc trực tiếp tab ServiceOrders trong Spreadsheet)
        try {
            const apiRes = await callSheetAPI({
                action: 'lookupOrderByCode',
                orderCode: cleanCode
            });

            if (apiRes && apiRes.success && apiRes.order) {
                const ord = apiRes.order;
                return {
                    orderCode: String(ord.orderCode || ord.id || cleanCode).trim(),
                    time: String(ord.time || ''),
                    createdAt: ord.createdAt || Date.now(),
                    platformKey: String(ord.platformKey || ''),
                    serviceKey: String(ord.serviceKey || ''),
                    platformName: String(ord.platformName || ''),
                    serviceName: String(ord.serviceName || ''),
                    serverName: String(ord.serverName || ''),
                    uid: String(ord.uid || ''),
                    quantity: Number(ord.quantity || 0),
                    cost: Number(ord.cost || 0),
                    retailPrice: Number(ord.retailPrice || ord.total || 0),
                    note: String(ord.note || ''),
                    status: String(ord.status || ''),
                    statusText: String(ord.status || '')
                };
            }
        } catch (err) {
            log(`Apps Script lookup cảnh báo: ${err.message}. Chuyển sang đọc dự phòng...`, 'info');
        }

        // 2. Dự phòng: Truy vấn trực tiếp gviz vào đúng tab ServiceOrders
        const query = encodeURIComponent(`SELECT * WHERE A = '${cleanCode.replace(/'/g, "\\'")}' LIMIT 1`);
        const url = `https://docs.google.com/spreadsheets/d/${SERVICE_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SERVICE_SHEET_NAME)}&tq=${query}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Không thể kết nối tới hệ thống dịch vụ.');

        const text = await response.text();
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) {
            return null;
        }

        const data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
        if (!data.table || !data.table.rows || data.table.rows.length === 0) {
            return null;
        }

        const row = data.table.rows[0].c;
        const getVal = (idx) => (row[idx] && row[idx].v !== null && row[idx].v !== undefined) ? row[idx].v : '';
        const getFormatted = (idx) => (row[idx] && row[idx].f) ? row[idx].f : getVal(idx);

        return {
            orderCode: String(getVal(0)).trim(),       // Cột A: Mã Đơn (id)
            time: String(getFormatted(1)),             // Cột B: Thời Gian (time)
            createdAt: getVal(2),                      // Cột C: Timestamp (createdAt)
            platformKey: String(getVal(3)),            // Cột D: Platform Key
            serviceKey: String(getVal(4)),             // Cột E: Service Key
            platformName: String(getVal(5)),           // Cột F: Nền Tảng (platformName)
            serviceName: String(getVal(6)),            // Cột G: Dịch Vụ (serviceName)
            serverName: String(getVal(7)),             // Cột H: Máy Chủ (serverName)
            uid: String(getVal(8)),                    // Cột I: Link / UID (uid)
            quantity: Number(getVal(9)) || 0,          // Cột J: Số Lượng (quantity)
            cost: Number(getVal(10)) || 0,             // Cột K: Giá Gốc (cost)
            retailPrice: Number(getVal(11)) || 0,      // Cột L: Tổng Thanh Toán (retailPrice)
            note: String(getVal(12)),                  // Cột M: Ghi Chú (note)
            status: String(getVal(13)),                // Cột N: Trạng Thái (status)
            statusText: String(getVal(13))
        };
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount) || 0);
    }

    // Render toàn bộ trường thông tin đơn hàng từ sheet ServiceOrders
    function renderOrderFieldsHTML(order) {
        const fields = [
            { label: 'Mã Đơn', value: `#${order.orderCode || order.id}` },
            { label: 'Thời Gian', value: order.time || (order.date ? new Date(order.date).toLocaleString('vi-VN') : '-') },
            { label: 'Trạng Thái', value: order.statusText || order.status },
            { label: 'Nền Tảng', value: `${order.platformName || '-'} (${order.platformKey || '-'})` },
            { label: 'Dịch Vụ', value: `${order.serviceName || '-'} (${order.serviceKey || '-'})`, fullWidth: true },
            { label: 'Máy Chủ', value: order.serverName || '-', fullWidth: true },
            { label: 'Link / UID', value: order.uid ? `<a href="${order.uid.startsWith('http') ? order.uid : 'https://' + order.uid}" target="_blank" style="color: var(--color-primary); word-break: break-all;">${order.uid}</a>` : '-', fullWidth: true },
            { label: 'Số Lượng', value: Number(order.quantity || 0).toLocaleString('vi-VN') },
            { label: 'Giá Gốc', value: formatCurrency(order.cost) },
            { label: 'Tổng Thanh Toán', value: `<strong style="color: var(--color-primary);">${formatCurrency(order.retailPrice || order.total)}</strong>` },
            { label: 'Ghi Chú', value: order.note || 'Không có', fullWidth: true }
        ];

        return fields.map(f => `
            <div style="${f.fullWidth ? 'grid-column: 1 / -1;' : ''} background: var(--color-white); padding: 0.6rem 0.8rem; border-radius: 6px; border: 1px solid var(--color-light);">
                <div style="font-size: 0.75rem; color: var(--color-info-dark); margin-bottom: 2px;">${f.label}</div>
                <div style="font-weight: 500; word-break: break-word;">${f.value}</div>
            </div>
        `).join('');
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

    // --- DATA LOADING ---
    async function loadInitialData() {
        log("Đang đồng bộ dữ liệu từ Google Sheets...", "info");
        try {
            const res = await callSheetAPI({ action: 'getUserData', username: loggedInUser });

            if (res.locked) {
                log('Phát hiện tài khoản bị khóa hoặc không tồn tại. Tự động đăng xuất.', 'error');
                sessionStorage.removeItem('loggedInUser');
                alert('Tài khoản của bạn đã bị khóa hoặc không hợp lệ. Vui lòng đăng nhập lại.');
                window.location.href = 'login.html';
                return;
            }

            if (!res.success) {
                throw new Error(res.message);
            }

            if (res.profile) updateProfileDOM(res.profile);
            userOrders = res.orders || [];
            displayOrders(userOrders);
            log("Tải dữ liệu tài khoản thành công!", "success");
        } catch (error) {
            log(`Lỗi khi tải dữ liệu: ${error.message}`, 'error');
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
            ordersTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Bạn chưa có đơn hàng nào. Bấm "Thêm đơn bằng mã" để liên kết đơn hàng.</td></tr>`;
        } else {
            orders.sort((a, b) => b.id - a.id).forEach(order => ordersTableBody.appendChild(createOrderRow(order)));
        }
        updateDashboardCards(orders || []);
    }

    function updateDashboardCards(orders) {
        totalOrdersCount.textContent = orders.length;
        pendingOrdersCount.textContent = orders.filter(o => {
            const st = String(o.status || '').toLowerCase();
            return ['pending', 'pending_approval', 'processing', 'chờ thanh toán', 'đang xử lý', 'chờ duyệt', 'đang chạy'].includes(st);
        }).length;
        completedOrdersCount.textContent = orders.filter(o => {
            const st = String(o.status || '').toLowerCase();
            return ['completed', 'hoàn thành', 'đã hoàn thành'].includes(st);
        }).length;
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

    function getStatusBadgeInfo(statusRaw) {
        if (statusMap[statusRaw]) return statusMap[statusRaw];
        const lower = String(statusRaw || '').toLowerCase();
        if (lower.includes('hoàn thành')) return { text: statusRaw, class: 'completed' };
        if (lower.includes('hủy')) return { text: statusRaw, class: 'cancelled' };
        if (lower.includes('đang chạy') || lower.includes('xử lý')) return { text: statusRaw, class: 'processing' };
        return { text: statusRaw || 'Chờ xử lý', class: 'pending' };
    }

    function createOrderRow(order) {
        const row = document.createElement('tr');
        row.dataset.orderId = order.id;
        const statusInfo = getStatusBadgeInfo(order.status);
        let statusText = statusInfo.text;
        if (order.requestedStatus) {
            const requestedStatusInfo = getStatusBadgeInfo(order.requestedStatus);
            statusText += ` (-> Yêu cầu: ${requestedStatusInfo.text})`;
        }

        const displayId = order.orderCode || order.id;
        const serviceSummary = order.platformName
            ? `<strong>${order.platformName}</strong> - ${order.serviceName || ''}`
            : 'Đơn hàng hệ thống';

        let actionsHTML = `<button class="table-action-btn view-detail-btn" title="Xem toàn bộ thông tin" style="color: var(--color-primary);"><i class='bx bx-show'></i></button>`;
        if (order.status === 'pending_approval' || String(order.status).toLowerCase() === 'chờ thanh toán') {
            actionsHTML += `<button class="table-action-btn delete-btn" title="Gỡ khỏi tài khoản"><i class='bx bxs-trash'></i></button>`;
        }
        const isCancellable = ['pending', 'shipped', 'processing', 'transferred'].includes(order.status);
        if (isCancellable && !order.requestedStatus) {
            actionsHTML += `<button class="table-action-btn request-cancel-btn" title="Yêu cầu Hủy"><i class='bx bxs-x-square'></i></button>`;
        }

        row.innerHTML = `
            <td><strong>#${displayId}</strong></td>
            <td>${serviceSummary}</td>
            <td>${Number(order.quantity || 1).toLocaleString('vi-VN')}</td>
            <td>${formatCurrency(order.retailPrice || order.total)}</td>
            <td><span class="status ${statusInfo.class}">${statusText}</span></td>
            <td><div class="action-btn-group">${actionsHTML}</div></td>
        `;
        return row;
    }

    // --- LOOKUP & SAVE ORDER BY CODE ---
    async function handleLookupOrder() {
        const code = orderCodeInput.value.trim().replace(/^#/, '').toUpperCase();
        if (!code) {
            showToast('Vui lòng nhập mã đơn hàng cần tra cứu.', 'error');
            return;
        }

        lookupOrderBtn.disabled = true;
        lookupOrderBtn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Đang tìm...`;
        orderPreviewBox.style.display = 'none';
        saveOrderBtn.disabled = true;
        currentLookedUpOrder = null;

        try {
            const foundOrder = await fetchOrderFromServiceSheet(code);

            if (!foundOrder) {
                throw new Error(`Không tìm thấy mã đơn #${code} trong mục ServiceOrders.`);
            }

            currentLookedUpOrder = foundOrder;
            orderPreviewDetails.innerHTML = renderOrderFieldsHTML(foundOrder);
            orderPreviewBox.style.display = 'block';
            saveOrderBtn.disabled = false;
            saveOrderBtn.removeAttribute('disabled');
            log(`Đã tìm thấy thông tin đơn hàng #${code} từ mục ServiceOrders.`, 'success');
        } catch (error) {
            showToast(error.message, 'error');
            log(`Tra cứu đơn #${code} thất bại: ${error.message}`, 'error');
        } finally {
            lookupOrderBtn.disabled = false;
            lookupOrderBtn.innerHTML = `<i class='bx bx-search'></i> Tra cứu`;
        }
    }

    async function saveLookedUpOrderToAccount(event) {
        if (event) event.preventDefault();
        if (isSavingOrder) return;

        if (!currentLookedUpOrder) {
            showToast('Vui lòng bấm "Tra cứu" mã đơn hàng trước khi lưu!', 'error');
            log('Bấm lưu nhưng chưa có dữ liệu đơn hàng được tra cứu.', 'error');
            return;
        }

        const codeToSave = String(currentLookedUpOrder.orderCode || currentLookedUpOrder.id || '')
            .trim()
            .replace(/^#/, '')
            .toUpperCase();

        if (!codeToSave) {
            showToast('Mã đơn hàng không hợp lệ.', 'error');
            return;
        }

        isSavingOrder = true;
        saveOrderBtn.disabled = true;
        saveOrderBtn.textContent = 'Đang lưu...';
        log(`Bắt đầu lưu đơn #${codeToSave} cho tài khoản [${loggedInUser}]...`, 'info');

        try {
            const payloadOrder = Object.assign({}, currentLookedUpOrder, {
                orderCode: codeToSave
            });

            const res = await callSheetAPI({
                action: 'claimOrderByCode',
                username: loggedInUser,
                order: payloadOrder
            });

            if (!res || !res.success) {
                throw new Error((res && res.message) ? res.message : 'Apps Script từ chối lưu đơn hàng.');
            }

            const savedOrderItem = Object.assign({}, payloadOrder, {
                id: res.id || Date.now(),
                orderCode: res.orderCode || codeToSave,
                username: loggedInUser
            });
            userOrders.unshift(savedOrderItem);
            displayOrders(userOrders);

            log(`Lưu thành công đơn #${savedOrderItem.orderCode} vào Google Sheets!`, 'success');
            closeModal(orderModal);
            orderForm.reset();
            orderPreviewBox.style.display = 'none';
            currentLookedUpOrder = null;
            showToast(`Đã lưu đơn hàng #${savedOrderItem.orderCode} vào tài khoản!`, 'success');

            setTimeout(() => loadInitialData(), 1200);
        } catch (error) {
            showToast(error.message || 'Lỗi khi lưu đơn hàng.', 'error');
            log(`LỖI LƯU ĐƠN #${codeToSave}: ${error.message}`, 'error');
            saveOrderBtn.disabled = false;
            saveOrderBtn.removeAttribute('disabled');
        } finally {
            isSavingOrder = false;
            saveOrderBtn.textContent = 'Lưu vào tài khoản';
        }
    }

    function handleViewOrderDetail(orderId) {
        const order = userOrders.find(o => o.id === orderId);
        if (!order) return;
        detailModalTitle.textContent = `Chi tiết đơn hàng #${order.orderCode || order.id}`;
        orderFullDetails.innerHTML = renderOrderFieldsHTML(order);
        openModal(orderDetailModal);
    }

    function handleCancellationRequest(orderId) {
        showConfirmModal('Bạn có chắc muốn gửi yêu cầu hủy cho đơn hàng này?', async (confirmed) => {
            if (confirmed) {
                try {
                    const res = await callSheetAPI({ action: 'requestCancelOrder', id: orderId });
                    if (!res.success) throw new Error(res.message);
                    log(`Đã gửi yêu cầu hủy cho đơn hàng #${res.orderCode || orderId}.`, 'info');
                    showToast('Đã gửi yêu cầu hủy. Vui lòng chờ Admin phê duyệt.', 'success');
                    await loadInitialData();
                } catch (error) {
                    log(`Lỗi khi gửi yêu cầu hủy đơn #${orderId}: ${error.message}`, 'error');
                    showToast('Có lỗi xảy ra khi gửi yêu cầu.', 'error');
                }
            }
        }, true);
    }

    function handleDeleteOrder(orderId) {
        const order = userOrders.find(o => o.id === orderId);
        showConfirmModal(`Bạn có chắc muốn gỡ đơn hàng #${order ? (order.orderCode || orderId) : orderId} khỏi danh sách?`, async (confirmed) => {
            if (confirmed) {
                try {
                    const res = await callSheetAPI({ action: 'deleteOrder', id: orderId });
                    if (!res.success) throw new Error(res.message);
                    const msg = `Đã gỡ đơn hàng #${res.orderCode || orderId}.`;
                    log(msg, 'success');
                    showToast(msg, 'success');
                    await loadInitialData();
                } catch (error) {
                    log(`Lỗi khi xóa đơn hàng #${orderId}: ${error.message}`, 'error');
                    showToast(error.message || 'Lỗi khi xóa đơn hàng.', 'error');
                }
            }
        }, true);
    }

    // --- EVENT LISTENERS SETUP ---
    function setupEventListeners() {
        if (menuToggle) menuToggle.addEventListener('click', () => document.body.classList.add('sidebar-visible'));
        if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => document.body.classList.remove('sidebar-visible'));
        document.getElementById('user-profile-link')?.addEventListener('click', () => window.location.href = 'user.html');

        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                menuItems.forEach(i => i.classList.remove('active'));
                contentSections.forEach(s => s.classList.remove('active'));
                item.classList.add('active');
                const sectionId = item.id.replace('-link', '-section');
                const targetSection = document.getElementById(sectionId);
                if (targetSection) {
                    targetSection.classList.add('active');
                    mainTitle.textContent = item.querySelector('span').textContent;
                }
                document.body.classList.remove('sidebar-visible');
            });
        });

        themeToggleCheckbox.addEventListener('change', () => setTheme(themeToggleCheckbox.checked ? 'dark' : 'light'));
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showConfirmModal('Bạn có chắc chắn muốn đăng xuất?', (confirmed) => {
                if (confirmed) {
                    log('Người dùng đăng xuất.', 'info');
                    sessionStorage.removeItem('loggedInUser');
                    showToast('Đang đăng xuất...', 'info');
                    setTimeout(() => window.location.href = 'login.html', 1000);
                }
            });
        });

        document.getElementById('add-order-btn').addEventListener('click', () => {
            log('Mở cửa sổ thêm đơn hàng bằng mã code.', 'info');
            orderForm.reset();
            orderPreviewBox.style.display = 'none';
            saveOrderBtn.disabled = true;
            currentLookedUpOrder = null;
            openModal(orderModal);
            setTimeout(() => orderCodeInput.focus(), 100);
        });

        lookupOrderBtn.addEventListener('click', handleLookupOrder);
        orderCodeInput.addEventListener('input', () => {
            if (currentLookedUpOrder && orderCodeInput.value.trim().replace(/^#/, '').toUpperCase() !== currentLookedUpOrder.orderCode) {
                orderPreviewBox.style.display = 'none';
                saveOrderBtn.disabled = true;
                currentLookedUpOrder = null;
            }
        });

        document.getElementById('close-order-modal-btn').addEventListener('click', () => closeModal(orderModal));
        orderModal.addEventListener('click', (e) => { if (e.target === orderModal) closeModal(orderModal); });

        // Chỉ gắn duy nhất sự kiện submit cho form để tránh gửi trùng 2 request
        orderForm.addEventListener('submit', saveLookedUpOrderToAccount);

        document.getElementById('close-detail-modal-btn')?.addEventListener('click', () => closeModal(orderDetailModal));
        orderDetailModal?.addEventListener('click', (e) => { if (e.target === orderDetailModal) closeModal(orderDetailModal); });

        ordersTableBody.addEventListener('click', (event) => {
            const button = event.target.closest('button.table-action-btn');
            if (!button) return;
            const orderId = Number(button.closest('tr').dataset.orderId);
            if (button.classList.contains('view-detail-btn')) handleViewOrderDetail(orderId);
            else if (button.classList.contains('delete-btn')) handleDeleteOrder(orderId);
            else if (button.classList.contains('request-cancel-btn')) handleCancellationRequest(orderId);
        });

        document.getElementById('toggle-log-btn').addEventListener('click', () => logConsole.classList.toggle('collapsed'));
        document.getElementById('clear-log-btn').addEventListener('click', () => { logContent.innerHTML = ''; log('Log đã được xóa.', 'info'); });
        document.querySelector('.log-filters').addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                const filter = e.target.dataset.filter;
                document.querySelectorAll('.log-filters .filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                document.querySelectorAll('.log-entry').forEach(entry => {
                    entry.style.display = (filter === 'all' || entry.dataset.logType === filter) ? 'flex' : 'none';
                });
            }
        });
    }

    function setTheme(theme) {
        document.body.classList.toggle('dark-theme', theme === 'dark');
        localStorage.setItem('theme', theme);
        themeToggleCheckbox.checked = (theme === 'dark');
        log(`Giao diện đã đổi sang chế độ: ${theme}`, 'info');
    }

    setupEventListeners();
    setTheme(localStorage.getItem('theme') || 'light');
    loadInitialData();
});