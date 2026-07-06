// Khai báo DOM Elements (Đã cập nhật để thêm các field mới)
const amountInput = document.getElementById('amount-input');
const messageContainer = document.getElementById('message-container');
const bankSelect = document.getElementById('bank-select');
const partnerIdInput = document.getElementById('partner-id-input'); // Đã đổi tên ID
const accountOwnerInput = document.getElementById('account-owner');
// const sourceTypeSelect = document.getElementById('source-type-select'); // Không dùng trong HTML hiện tại
const transactionTypeSelect = document.getElementById('transaction-type-select');
const contentInput = document.getElementById('transfer-content');
const defaultContentTemplate = document.getElementById('default-content-template'); 
const refundIdInput = document.getElementById('refund-id');
const dateInput = document.getElementById('date-input');
const timeInput = document.getElementById('time-input');
const delayInput = document.getElementById('delay-input');
const errorCodeInput = document.getElementById('error-code-input');
const dailyLimitInput = document.getElementById('daily-limit-input');
// const tagsInput = document.getElementById('tags-input'); // Không dùng trong HTML hiện tại
const balanceDisplay = document.getElementById('current-balance-display');
const lockScreen = document.getElementById('lock-screen');
const pinDisplay = document.getElementById('pin-display');
const mainContainer = document.getElementById('main-container');
const historyContainer = document.getElementById('history-container');
const simulatedStatusSelect = document.getElementById('simulated-status-select');
const modal = document.getElementById('transaction-detail-modal');

// DOM elements mới cho tính năng chuyên nghiệp
const activeAccountSelect = document.getElementById('active-account-select');
const newAccountNameInput = document.getElementById('new-account-name');
const webhookUrlInput = document.getElementById('webhook-url');
const webhookStatusSelect = document.getElementById('webhook-status');
const webhookDelayInput = document.getElementById('webhook-delay');
const webhookSecretInput = document.getElementById('webhook-secret');

// State Management
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let accounts = JSON.parse(localStorage.getItem('accounts')) || {};
let activeAccountId = localStorage.getItem('activeAccountId') || '';
let currentBalance = 0; // Sẽ được lấy từ active account
const CORRECT_PIN = "1239"; 
const BANK_ACCOUNT = "10123456789"; // Số tài khoản mặc định (có thể thay đổi)
let pinCode = ""; // <<-- KHAI BÁO BIẾN PIN CODE ĐÃ BỊ THIẾU

// --- HELPER FUNCTIONS ---

function formatCurrency(amount) {
    if (isNaN(amount)) return '0 VND';
    return amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ' VND';
}

function formatInput(inputElement) {
    let value = inputElement.value.replace(/[^0-9]/g, '');
    inputElement.dataset.originalValue = value; 
    inputElement.value = formatCurrency(parseFloat(value)).replace(' VND', '');
}

function updateDateTimeInputs() {
    const now = new Date();
    const dateStr = now.toISOString().substring(0, 10);
    const timeStr = now.toTimeString().substring(0, 8); 
    dateInput.value = dateStr;
    timeInput.value = timeStr;
}

// --- ACCOUNT MANAGEMENT ---

function loadAccounts() {
    accounts = JSON.parse(localStorage.getItem('accounts')) || {
        'default': {
            id: 'default',
            name: 'Tài khoản Chính (VCB)',
            bankCode: 'VCB',
            partnerId: 'ECOMMERCE_GATEWAY',
            owner: 'NGUYEN VAN A',
            balance: 0
        }
    };
    if (!activeAccountId || !accounts[activeAccountId]) {
        activeAccountId = 'default';
    }
    saveAccounts();
    renderAccountSelect();
    switchAccount(activeAccountId);
}

function saveAccounts() {
    localStorage.setItem('accounts', JSON.stringify(accounts));
    localStorage.setItem('activeAccountId', activeAccountId);
}

function renderAccountSelect() {
    activeAccountSelect.innerHTML = '';
    for (const id in accounts) {
        const acc = accounts[id];
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${acc.name} (${acc.partnerId} - ${getBankName(acc.bankCode)})`;
        if (id === activeAccountId) {
            option.selected = true;
        }
        activeAccountSelect.appendChild(option);
    }
}

function switchAccount(id = activeAccountSelect.value) {
    activeAccountId = id;
    const acc = accounts[activeAccountId];
    if (acc) {
        currentBalance = acc.balance;
        bankSelect.value = acc.bankCode;
        partnerIdInput.value = acc.partnerId;
        accountOwnerInput.value = acc.owner;
        updateBalanceDisplay();
    }
    saveAccounts();
    renderHistory(); // Cập nhật lịch sử theo tài khoản
}

function addOrUpdateAccount() {
    const newName = newAccountNameInput.value.trim();
    const newPartnerId = partnerIdInput.value.trim();
    const newOwner = accountOwnerInput.value.trim();
    const newBankCode = bankSelect.value;
    const newId = newPartnerId.toLowerCase().replace(/[^a-z0-9]/g, '_');

    if (!newName || !newPartnerId || !newOwner) {
        alert("Vui lòng điền đủ Tên gợi nhớ, Partner ID và Tên Chủ TK.");
        return;
    }

    const existingAcc = accounts[newId];
    if (existingAcc) {
        if (!confirm(`Tài khoản với ID "${newId}" đã tồn tại. Bạn có muốn cập nhật không?`)) {
            return;
        }
        existingAcc.name = newName;
        existingAcc.bankCode = newBankCode;
        existingAcc.owner = newOwner;
        // Balance và PartnerId không đổi vì ID đã xác định
    } else {
        accounts[newId] = {
            id: newId,
            name: newName,
            bankCode: newBankCode,
            partnerId: newPartnerId,
            owner: newOwner,
            balance: 0
        };
    }

    activeAccountId = newId;
    saveAccounts();
    loadAccounts(); // Tải lại select box
    switchAccount(newId);
    newAccountNameInput.value = ''; // Clear input
    alert(`Đã ${existingAcc ? 'cập nhật' : 'thêm'} tài khoản thành công!`);
}


// --- WEBHOOK SIMULATION ---

/**
 * Tạo chữ ký HMAC-SHA256 giả lập
 */
function createSignature(data, secret) {
    // Trong môi trường trình duyệt, không có crypto trực tiếp. Giả lập một hash đơn giản.
    // Ở đây, tôi sẽ dùng một hàm băm đơn giản từ JSON string và secret để mô phỏng.
    const rawString = JSON.stringify(data) + secret;
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
        const char = rawString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16); // Trả về dạng hex đơn giản
}

/**
 * Mô phỏng việc gửi Webhook đến máy chủ đối tác
 */
function simulateWebhook(transaction) {
    const webhookUrl = webhookUrlInput.value.trim();
    const webhookStatus = webhookStatusSelect.value;
    const webhookDelay = parseInt(webhookDelayInput.value);
    const webhookSecret = webhookSecretInput.value;

    if (!webhookUrl) return { success: false, status: 'N/A', message: 'Webhook URL trống.' };

    // Tạo payload Webhook (Giả lập cấu trúc thông thường)
    const payload = {
        event: transaction.type.toUpperCase() + '_' + transaction.status.toUpperCase(),
        tx_id: transaction.txId,
        amount: transaction.amount,
        status: transaction.status,
        content: transaction.content,
        timestamp: transaction.timestamp,
        partner_id: transaction.partnerId,
        error_code: transaction.errorCode,
        // tags bị loại bỏ do không có input trong HTML, thay bằng một metadata trống
        metadata: { refund_id: transaction.refundId } 
    };
    
    // Thêm chữ ký giả lập
    payload.signature = createSignature(payload, webhookSecret);


    const logMessage = `Đang gửi Webhook tới ${webhookUrl}...\n` +
                       `Payload: ${JSON.stringify(payload, null, 2)}\n` +
                       `Webhook Status Giả Lập: ${webhookStatus}`;

    appendMessage(transaction.txId, 'System', `<pre style="white-space: pre-wrap; font-size: 0.8em; margin: 0;">${logMessage}</pre>`, true);

    // Giả lập độ trễ Webhook
    setTimeout(() => {
        const responseMessage = `Callback Webhook nhận được phản hồi [${webhookStatus}].`;
        appendMessage(transaction.txId, 'System', responseMessage, true);
    }, webhookDelay);

    return { success: webhookStatus === '200', status: webhookStatus };
}


// --- MESSAGE AND HISTORY RENDERING ---

function appendMessage(txId, type, content, isSystem = false) {
    const wrapper = document.createElement('div');
    wrapper.classList.add(isSystem ? 'system-message-wrapper' : 'bank-message-wrapper');

    const bubble = document.createElement('div');
    bubble.classList.add(isSystem ? 'system-message' : 'bank-message');
    
    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('message-content-wrapper');
    contentWrapper.innerHTML = content;
    bubble.appendChild(contentWrapper);

    if (!isSystem) {
        const detailButton = document.createElement('button');
        detailButton.classList.add('message-action-btn');
        detailButton.textContent = '👁️ Xem Chi Tiết';
        detailButton.setAttribute('onclick', `window.showTransactionDetail('${txId}')`); 
        contentWrapper.appendChild(detailButton);
    }
    
    wrapper.appendChild(bubble);
    messageContainer.appendChild(wrapper);

    scrollToBottomMessage();
}

function clearMessages() {
    messageContainer.innerHTML = '<div class="system-message">Tin nhắn hiển thị đã được xóa.</div>';
}

function renderHistory() {
    historyContainer.innerHTML = ''; 
    const ul = document.createElement('ul');
    ul.classList.add('history-list');

    // Lọc giao dịch theo tài khoản đang hoạt động
    const accountTxs = transactions.filter(tx => tx.accountId === activeAccountId);

    if (accountTxs.length === 0) {
        historyContainer.innerHTML = '<p style="color: #aaa; text-align: center; padding: 10px;">Chưa có giao dịch nào cho tài khoản này.</p>';
        return;
    }

    accountTxs.slice().reverse().forEach(tx => {
        const li = document.createElement('li');
        li.classList.add('history-item');
        li.classList.add(`status-${tx.status}`);

        const iconHtml = `<div class="tx-type-icon ${tx.type}">${tx.type === 'Payment' ? '↑' : '↓'}</div>`;

        const infoHtml = `
            <div class="tx-info">
                <span class="tx-description">${tx.content}</span>
                <span class="tx-summary">${tx.partnerId}</span>
                <span class="tx-id-display">ID: ${tx.txId}</span>
            </div>
        `;
        
        const statusClass = `status-${tx.status}`;
        const amountDisplay = tx.type === 'Payment' 
            ? `<span style="color: var(--payment-color); font-weight: 600;">+${formatCurrency(tx.amount)}</span>`
            : `<span style="color: var(--refund-color); font-weight: 600;">-${formatCurrency(tx.amount)}</span>`;

        const timeHtml = `
            <div class="tx-date-time">
                ${amountDisplay}
                <br>
                <span class="${statusClass}">${tx.status}</span>
            </div>
        `;

        const detailButton = document.createElement('button');
        detailButton.classList.add('message-action-btn'); 
        detailButton.textContent = 'Xem Chi Tiết';
        detailButton.style.alignSelf = 'center'; 
        detailButton.style.padding = '8px 12px'; 
        detailButton.style.marginLeft = '10px';
        detailButton.style.backgroundColor = 'var(--accent-color)'; 
        detailButton.style.color = 'white';
        detailButton.setAttribute('onclick', `window.showTransactionDetail('${tx.txId}')`); 
        
        li.innerHTML = iconHtml + infoHtml + timeHtml;
        li.appendChild(detailButton);
        
        ul.appendChild(li);
    });

    historyContainer.appendChild(ul);
}


// --- TRANSACTION LOGIC ---

function generateTxId() {
    return 'TX' + Math.floor(Math.random() * 9000000000 + 1000000000).toString();
}

function getBankName(code) {
    const banks = {
        VCB: 'Vietcombank',
        TCB: 'Techcombank',
        MB: 'MB Bank'
    };
    return banks[code] || 'Unknown Bank';
}

function processTransaction(type) {
    const rawAmount = parseFloat(amountInput.dataset.originalValue);

    if (isNaN(rawAmount) || rawAmount <= 0) {
        alert("Vui lòng nhập số tiền hợp lệ (> 0).");
        return;
    }

    const txId = generateTxId();
    const status = simulatedStatusSelect.value;
    const isSuccess = status === 'Success';
    const delay = parseInt(delayInput.value) * 1000;
    const now = new Date(`${dateInput.value}T${timeInput.value}`);
    const timeStr = now.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'medium' });

    let content = contentInput.value.trim();
    if (!content) {
        content = defaultContentTemplate.value.replace('{TX_ID}', txId);
    }
    
    const activeAcc = accounts[activeAccountId];

    const transaction = {
        txId: txId,
        type: type, 
        amount: rawAmount,
        status: status, 
        content: content,
        timestamp: now.toISOString(),
        timeDisplay: timeStr,
        // Lấy từ tài khoản hoạt động
        partnerId: activeAcc.partnerId, 
        // sourceType: sourceTypeSelect.value, // Removed because no HTML input
        bankCode: activeAcc.bankCode,
        bankName: getBankName(activeAcc.bankCode),
        account: BANK_ACCOUNT,
        owner: activeAcc.owner,
        // Metadata
        accountId: activeAccountId, 
        errorCode: errorCodeInput.value,
        refundId: refundIdInput.value,
        // tags: tagsInput.value, // Removed because no HTML input
        webhookStatus: 'N/A' // Trạng thái Webhook ban đầu
    };

    let messageContent;
    let balanceChange = 0;

    if (type === 'Payment') {
        balanceChange = rawAmount;
        if (isSuccess) {
            messageContent = `Tài khoản ${transaction.account} (+${formatCurrency(rawAmount)}) đã nhận tiền. \nNội dung: ${content}. \nGD ID: ${txId}.`;
        } else if (status === 'Failure') {
            messageContent = `Giao dịch nhận tiền thất bại. Mã lỗi ${transaction.errorCode}. \nChi tiết: ${content}. \nGD ID: ${txId}.`;
        } else { 
            messageContent = `Giao dịch đang chờ xử lý. (+${formatCurrency(rawAmount)}) \nGD ID: ${txId}.`;
        }
    } else if (type === 'Refund') {
        balanceChange = -rawAmount;
        if (isSuccess) {
            messageContent = `Hoàn tiền thành công. TK ${transaction.account} (-${formatCurrency(rawAmount)}). \nNội dung: ${content}. \nRef. ID: ${transaction.refundId}. \nGD ID: ${txId}.`;
        } else if (status === 'Failure') {
             messageContent = `Yêu cầu hoàn tiền thất bại. Mã lỗi ${transaction.errorCode}. \nRef. ID: ${transaction.refundId}. \nGD ID: ${txId}.`;
        } else { 
            messageContent = `Yêu cầu hoàn tiền đang chờ xử lý. (-${formatCurrency(rawAmount)}). \nGD ID: ${txId}.`;
        }
    } else if (type === 'Fee') {
        balanceChange = -rawAmount;
        if (isSuccess) {
             messageContent = `TK ${transaction.account} bị trừ phí (-${formatCurrency(rawAmount)}). \nNội dung: ${content}. \nGD ID: ${txId}.`;
        } else if (status === 'Failure') {
            messageContent = `Giao dịch trừ phí thất bại. Mã lỗi ${transaction.errorCode}. \nGD ID: ${txId}.`;
        } else {
             messageContent = `Giao dịch trừ phí đang chờ xử lý. (-${formatCurrency(rawAmount)}). \nGD ID: ${txId}.`;
        }
    }
    
    // Gửi Webhook nếu thành công/thất bại và có URL
    if (webhookUrlInput.value.trim() && status !== 'Pending') {
        const webhookResult = simulateWebhook(transaction);
        transaction.webhookStatus = webhookResult.status;
    }

    // Cập nhật số dư nếu thành công
    if (isSuccess) {
        accounts[activeAccountId].balance += balanceChange;
        currentBalance = accounts[activeAccountId].balance;
        saveAccounts();
        updateBalanceDisplay();
    }
    
    // Thêm giao dịch vào danh sách và lưu
    transactions.push(transaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));


    // Hiển thị tin nhắn sau độ trễ
    setTimeout(() => {
        appendMessage(txId, type, messageContent, false);
        renderHistory();
    }, delay);

    contentInput.value = ''; 
    refundIdInput.value = '';
    updateDateTimeInputs();
}

function simulatePayment() {
    processTransaction('Payment');
}

function simulateRefund() {
    processTransaction('Refund');
}

function simulateFee() {
     processTransaction('Fee');
}


// --- MODAL (POPUP) LOGIC ---

function showTransactionDetail(transactionId) {
    const tx = transactions.find(t => t.txId === transactionId);
    if (!tx) {
        alert("Không tìm thấy giao dịch này.");
        return;
    }

    document.getElementById('modal-tx-id').textContent = tx.txId;
    document.getElementById('modal-bank-acc').textContent = tx.account;
    document.getElementById('modal-bank-name').textContent = `${tx.bankName} (${tx.bankCode})`;
    
    const amountSign = tx.type === 'Payment' ? '+' : '-';
    const amountElement = document.getElementById('modal-amount');
    amountElement.textContent = `${amountSign}${formatCurrency(tx.amount)}`;
    amountElement.style.color = tx.type === 'Payment' ? 'var(--payment-color)' : 'var(--refund-color)';

    document.getElementById('modal-content').textContent = tx.content;
    document.getElementById('modal-time').textContent = tx.timeDisplay;
    
    const statusElement = document.getElementById('modal-status');
    statusElement.textContent = tx.status + (tx.errorCode && tx.status === 'Failure' ? ` (${tx.errorCode})` : '');
    statusElement.className = 'detail-value status-' + tx.status;
    
    // Hiển thị Webhook Status mới
    document.getElementById('modal-webhook-status').textContent = tx.webhookStatus;

    const qrContent = `PAYMENT|${tx.txId}|${tx.amount}|${tx.bankCode}|${tx.account}|${tx.owner}`;
    document.getElementById('modal-qr-content').textContent = qrContent;
    
    modal.style.display = 'block';
}

function closeModal() {
    modal.style.display = 'none';
}

function closeModalOnOutsideClick(event) {
    if (event.target === modal) {
        closeModal();
    }
}

// --- INITIALIZATION AND PERSISTENCE ---

function updateBalanceDisplay() {
    balanceDisplay.textContent = `Số dư hiện tại (${accounts[activeAccountId]?.name || 'N/A'}): ${formatCurrency(currentBalance)}`;
}

function clearAllDataAndReset() {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử giao dịch và các tài khoản đã lưu không?")) {
        localStorage.clear(); 
        transactions = [];
        accounts = {};
        activeAccountId = '';
        currentBalance = 0;
        loadAccounts(); // Tải lại tài khoản mặc định
        updateBalanceDisplay();
        renderHistory();
        clearMessages();
        alert("Đã reset tất cả dữ liệu thành công. Vui lòng tạo lại tài khoản nếu cần.");
    }
}

function exportTransactions() {
    if (transactions.length === 0) {
        alert("Không có giao dịch nào để xuất.");
        return;
    }
    
    // Thêm trường accountId và webhookStatus vào header
    const headers = ["ID", "LoaiGD", "SoTien", "TrangThai", "WebhookStatus", "NoiDung", "ThoiGian", "Partner", "NganHang", "ChuTaiKhoan", "MaLoi", "RefId", "AccountId"];
    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + transactions.map(tx => [
            tx.txId,
            tx.type,
            tx.amount,
            tx.status,
            tx.webhookStatus, // Trường mới
            `"${tx.content.replace(/"/g, '""')}"`, 
            tx.timestamp,
            tx.partnerId,
            tx.bankCode,
            tx.owner,
            tx.errorCode,
            tx.refundId,
            tx.accountId // Trường mới
        ].join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cashbank_export_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
    alert("Đã xuất file CSV thành công!");
}


// --- LOCK SCREEN LOGIC ---
function updatePinDisplay() {
    const dots = pinDisplay.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index < pinCode.length);
    });
}

function enterPin(number) {
    if (pinCode.length < 4) {
        pinCode += number;
        updatePinDisplay();
    }
    if (pinCode.length === 4) {
        setTimeout(checkPassword, 300);
    }
}

function deletePin() {
    pinCode = pinCode.slice(0, -1);
    updatePinDisplay();
}

function checkPassword() {
    if (pinCode === CORRECT_PIN) {
        initializeApp();
        lockScreen.style.opacity = '0';
        lockScreen.style.visibility = 'hidden';
    } else {
        alert("Mã PIN không đúng.");
        pinCode = '';
        updatePinDisplay();
    }
}


function initializeApp() {
    mainContainer.style.display = 'grid';
    updateDateTimeInputs();
    loadAccounts(); // Tải và thiết lập tài khoản ngay khi vào
    
    renderHistory();
    scrollToBottomMessage(); 

    amountInput.oninput = () => formatInput(amountInput);
    dailyLimitInput.oninput = () => formatInput(dailyLimitInput);
}

function scrollToBottomMessage() {
    const chatContainer = document.querySelector('.telegram-chat');
    if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}


// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
    // Gán các hàm vào Window
    window.processTransaction = processTransaction;
    window.simulatePayment = simulatePayment;
    window.simulateRefund = simulateRefund;
    window.simulateFee = simulateFee;
    window.exportTransactions = exportTransactions;
    window.enterPin = enterPin;
    window.deletePin = deletePin;
    window.checkPassword = checkPassword;
    window.clearAllDataAndReset = clearAllDataAndReset; 
    window.clearMessages = clearMessages; 
    window.showTransactionDetail = showTransactionDetail; 
    window.closeModal = closeModal; 
    window.closeModalOnOutsideClick = closeModalOnOutsideClick; 
    window.formatInput = formatInput; 
    window.switchAccount = switchAccount;
    window.addOrUpdateAccount = addOrUpdateAccount;
    
    updatePinDisplay();
    
    // Tự động vào ứng dụng nếu đã mở khóa (hoặc chạy trong dev mode)
    if (lockScreen.style.visibility === 'hidden') {
         initializeApp();
    }
});