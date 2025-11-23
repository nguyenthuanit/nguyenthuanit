// Khai báo DOM Elements
const amountInput = document.getElementById('amount-input');
const messageContainer = document.getElementById('message-container');
const bankSelect = document.getElementById('bank-select');
const partnerNameInput = document.getElementById('partner-name');
const accountOwnerInput = document.getElementById('account-owner');
const sourceTypeSelect = document.getElementById('source-type-select');
const transactionTypeSelect = document.getElementById('transaction-type-select');
const contentInput = document.getElementById('transfer-content');
const defaultContentTemplate = document.getElementById('default-content-template'); 
const refundIdInput = document.getElementById('refund-id');
const dateInput = document.getElementById('date-input');
const timeInput = document.getElementById('time-input');
const delayInput = document.getElementById('delay-input');
const errorCodeInput = document.getElementById('error-code-input');
const dailyLimitInput = document.getElementById('daily-limit-input');
const tagsInput = document.getElementById('tags-input');
const balanceDisplay = document.getElementById('current-balance-display');
const lockScreen = document.getElementById('lock-screen');
const pinDisplay = document.getElementById('pin-display');
const mainContainer = document.getElementById('main-container');
const historyContainer = document.getElementById('history-container');
const simulatedStatusSelect = document.getElementById('simulated-status-select'); 
// **BỔ SUNG: DOM Modal**
const detailModal = document.getElementById('transaction-detail-modal');
const detailContent = document.getElementById('detail-content');
const qrCodeDisplay = document.getElementById('qr-code-display');

// **DOM cho chi tiết Modal (CẢI TIẾN)**
const modalTxId = document.getElementById('modal-tx-id');
const modalBankAcc = document.getElementById('modal-bank-acc');
const modalBankName = document.getElementById('modal-bank-name');
const modalAmount = document.getElementById('modal-amount');
const modalContent = document.getElementById('modal-content');
const modalStatus = document.getElementById('modal-status');
const modalTime = document.getElementById('modal-time');
const modalQrContent = document.getElementById('modal-qr-content'); // Thêm ID cho nội dung QR giả lập
const detailModalTitle = document.querySelector('#transaction-detail-modal .modal-h2');


// Khai báo biến
const CORRECT_PIN_HASH = '310ced37200b1a0dae25edb263fe52c491f6e467268acab0ffec06666e2ed959'; // Mã Hash cho PIN 1239
let currentPin = '';
let currentBalance = 0.00; 
let dailyTransactionTotal = 0.00; 


// Cấu hình IndexedDB
const DB_NAME = 'FakeGatewayDB';
const DB_VERSION = 3; 
const STORE_BALANCE = 'BalanceStore';
const STORE_TRANSACTIONS = 'TransactionStore';
const BALANCE_KEY = 'currentBalance';
const DAILY_TOTAL_KEY = 'dailyTotal'; 


// --- HÀM MÃ HÓA SHA-256 (Dùng cho PIN) ---
async function sha256(message) {
    if (!crypto.subtle) {
        console.error("Trình duyệt không hỗ trợ mã hóa SublteCrypto.");
        return message; 
    }
    const msgBuffer = new TextEncoder().encode(message); 
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer); 
    const hashArray = Array.from(new Uint8Array(hashBuffer)); 
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); 
    return hashHex;
}

// --- HÀM MÀN HÌNH KHÓA (LOCK SCREEN) ---
function updatePinDisplay() {
    const dots = pinDisplay.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        if (index < currentPin.length) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

/**
 * Thêm ký tự vào PIN hiện tại.
 * Bổ sung: Tự động kiểm tra PIN khi nhập đủ 4 ký tự.
 */
function enterPin(num) {
    if (currentPin.length < 4) {
        currentPin += num.toString();
        updatePinDisplay();
        
        // --- BỔ SUNG: TỰ ĐỘNG ĐĂNG NHẬP KHI ĐỦ 4 KÝ TỰ ---
        if (currentPin.length === 4) {
            // Tự động kiểm tra mật khẩu sau một khoảng trễ nhỏ
            setTimeout(checkPassword, 150); 
        }
        // --- KẾT THÚC BỔ SUNG ---
    }
}

function deletePin() {
    currentPin = currentPin.slice(0, -1);
    updatePinDisplay();
}

/**
 * Kiểm tra mã PIN. Được gọi tự động khi nhập đủ 4 ký tự hoặc nhấn OK.
 */
async function checkPassword() {
    // Yêu cầu phải nhập đủ 4 ký tự
    if (currentPin.length !== 4) { 
        document.querySelector('.lock-card').style.animation = 'shake 0.5s';
        setTimeout(() => {
            document.querySelector('.lock-card').style.animation = '';
        }, 500);
        return;
    }
    
    const enteredPinHash = await sha256(currentPin); 
    const lockCard = document.querySelector('.lock-card');
    const lockHint = document.querySelector('.lock-hint');
    
    if (enteredPinHash === CORRECT_PIN_HASH) {
        lockScreen.classList.add('hidden');
        setTimeout(() => {
            lockScreen.style.display = 'none';
            mainContainer.style.display = 'flex'; 
            initializeApp(); // Gọi hàm khởi tạo
        }, 500); 

        currentPin = ''; 
    } else {
        // Phản hồi lỗi
        lockHint.textContent = '❌ Mã PIN sai! Vui lòng thử lại.';
        lockHint.style.color = 'var(--refund-bg)';
        
        lockCard.style.animation = 'shake 0.5s';
        setTimeout(() => {
            lockCard.style.animation = '';
            currentPin = '';
            updatePinDisplay();
            lockHint.textContent = 'Mã PIN mặc định: **1239**'; // Reset hint
            lockHint.style.color = ''; // Reset màu
        }, 1000); // Tăng thời gian để người dùng kịp đọc thông báo
    }
}

const style = document.createElement('style');
style.type = 'text/css';
style.innerHTML += `
@keyframes shake {
    0%, 100% {transform: translateX(0);}
    20%, 60% {transform: translateX(-10px);}
    40%, 80% {transform: translateX(10px);}
}

#lock-screen.hidden {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
}
/* **BỔ SUNG: CSS cho Modal và QR Code** */
.modal {
    display: none;
    position: fixed;
    z-index: 1001; 
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgba(0,0,0,0.8);
    padding-top: 60px;
}

.modal-content {
    background-color: var(--container-bg);
    margin: 5% auto;
    padding: 20px;
    border: 1px solid var(--panel-border);
    width: 80%;
    max-width: 600px;
    border-radius: 10px;
    position: relative;
    box-shadow: 0 5px 15px rgba(0,0,0,0.5);
    /* **CẢI TIẾN: Bố cục 2 cột cho Modal** */
    display: grid; 
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}
.modal-qr-section {
    grid-column: 1 / 2;
}
.modal-details {
    grid-column: 2 / 3;
}


.close-button {
    color: var(--text-color);
    float: right;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
}

.close-button:hover,
.close-button:focus {
    color: var(--refund-bg);
    text-decoration: none;
    cursor: pointer;
}

.detail-item {
    padding: 8px 0;
    border-bottom: 1px dashed #30363d;
    display: flex;
    justify-content: space-between;
    font-size: 14px;
}
.detail-item:last-child {
    border-bottom: none;
}
.detail-label {
    font-weight: 600;
    color: var(--accent-color);
}
.detail-value {
    max-width: 60%;
    text-align: right;
    word-wrap: break-word;
}
.qr-code-placeholder {
    width: 150px;
    height: 150px;
    margin: 20px auto 0;
    border: 5px solid white;
    background-color: #eee;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    font-weight: bold;
    color: #333;
    border-radius: 5px;
    /* **CẢI TIẾN: Thêm hiệu ứng cho QR giả lập** */
    box-shadow: 0 0 10px rgba(126, 146, 255, 0.5);
    cursor: pointer;
    position: relative;
}
.qr-code-placeholder:hover {
    opacity: 0.9;
}

/* **BỔ SUNG: Nội dung QR (Giả lập)** */
#modal-qr-content {
    font-size: 12px;
    color: #fff;
    margin-top: 10px;
    padding: 5px 10px;
    background-color: #333;
    border-radius: 5px;
    text-align: center;
    cursor: text;
    user-select: all;
    word-break: break-all;
}


.message-content-wrapper {
    display: flex; 
    flex-direction: column;
    gap: 5px;
}
.message-action-btn {
    padding: 5px 10px;
    background-color: #555;
    border: none;
    border-radius: 5px;
    color: white;
    cursor: pointer;
    font-size: 12px;
    margin-top: 5px;
    align-self: flex-end;
}
.message-action-btn:hover {
    background-color: #777;
}
/* **BỔ SUNG: Màu sắc cho Trạng thái GD trong Modal** */
.status-Success { color: var(--payment-color); font-weight: bold; }
.status-Failure { color: var(--refund-color); font-weight: bold; }
.status-Pending { color: var(--fail-color); font-weight: bold; }

`;
document.getElementsByTagName('head')[0].appendChild(style);


// --- HÀM INDEXEDDB ---
function openDatabase() {
     return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject("IndexedDB not supported");
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_BALANCE)) {
                db.createObjectStore(STORE_BALANCE);
            }
            if (!db.objectStoreNames.contains(STORE_TRANSACTIONS)) {
                db.createObjectStore(STORE_TRANSACTIONS, { keyPath: 'transactionId' }).createIndex('timestamp', 'timestamp', { unique: false }); 
            }
        };
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
        request.onerror = (event) => {
            console.error("Lỗi IndexedDB:", event.target.errorCode);
            reject(event.target.error);
        };
    });
}

async function saveValue(storeName, key, value) {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.put(value, key);
        return new Promise(resolve => transaction.oncomplete = resolve);
    } catch (e) {
        console.error(`Lỗi khi lưu ${key}:`, e);
    }
}

async function getValue(storeName, key) {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        return new Promise((resolve) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                console.error(`Lỗi khi đọc ${key}:`, request.error);
                resolve(null);
            };
        });
    } catch (e) {
        console.error(`Lỗi khi đọc ${key}:`, e);
        return null;
    }
}

async function saveBalanceAndDailyTotal(balance, transactionAmount) {
    await saveValue(STORE_BALANCE, BALANCE_KEY, balance);
    // Cập nhật tổng giao dịch trong ngày
    const today = new Date().toDateString();
    let dailyData = await getValue(STORE_BALANCE, DAILY_TOTAL_KEY) || {};
    if (dailyData.date !== today) {
        dailyData = { date: today, total: 0 };
    }
    dailyData.total += Math.abs(transactionAmount);
    dailyTransactionTotal = dailyData.total;
    await saveValue(STORE_BALANCE, DAILY_TOTAL_KEY, dailyData);
}

async function loadBalanceAndDailyTotal() {
    const balance = await getValue(STORE_BALANCE, BALANCE_KEY);
    if (balance !== null && balance !== undefined) {
        currentBalance = balance;
    } else {
        currentBalance = 0.00;
    }
    
    const today = new Date().toDateString();
    const dailyData = await getValue(STORE_BALANCE, DAILY_TOTAL_KEY);
    if (dailyData && dailyData.date === today) {
        dailyTransactionTotal = dailyData.total;
    } else {
        dailyTransactionTotal = 0.00;
        await saveValue(STORE_BALANCE, DAILY_TOTAL_KEY, { date: today, total: 0 }); // Khởi tạo lại
    }
    
    updateBalanceDisplay();
}

async function saveTransaction(transaction) {
    try {
        const db = await openDatabase();
        const transactionDb = db.transaction(STORE_TRANSACTIONS, 'readwrite');
        const store = transactionDb.objectStore(STORE_TRANSACTIONS);
        store.add(transaction);
        return new Promise(resolve => transactionDb.oncomplete = resolve);
    } catch (e) {
        console.error("Lỗi khi lưu giao dịch:", e);
    }
}

async function findTransaction(transactionId) {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_TRANSACTIONS, 'readonly');
        const store = transaction.objectStore(STORE_TRANSACTIONS);
        const request = store.get(transactionId.trim());
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                console.error("Lỗi khi tìm GD:", request.error);
                reject(request.error);
            };
        });
    } catch (e) {
        console.error("Lỗi khi tìm GD:", e);
        return null;
    }
}

function updateBalanceDisplay() {
    balanceDisplay.textContent = `Số dư hiện tại: ${formatNumber(currentBalance.toFixed(0))} VND`;
}

// --- HÀM TẢI VÀ HIỂN THỊ LỊCH SỬ GIAO DỊCH (ĐÃ HOÀN THIỆN) ---
async function loadTransactionHistory() {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_TRANSACTIONS, 'readonly');
        const store = transaction.objectStore(STORE_TRANSACTIONS);
        const transactions = [];
        const request = store.index('timestamp').openCursor(null, 'prev');
        
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor && transactions.length < 10) { // Chỉ hiển thị 10 giao dịch gần nhất
                transactions.push(cursor.value);
                cursor.continue();
            } else {
                renderHistory(transactions);
            }
        };
        request.onerror = (event) => {
            console.error("Lỗi khi đọc lịch sử GD:", event.target.error);
            historyContainer.innerHTML = '<p style="color: red; text-align: center;">Lỗi tải lịch sử giao dịch.</p>';
        };
    } catch (e) {
        console.error("Lỗi khi tải lịch sử giao dịch:", e);
    }
}

/**
 * **HOÀN THIỆN HÀM RENDER HISTORY (CẢI TIẾN)**
 * Thêm icon, tóm tắt và cho phép click để xem chi tiết
 */
function renderHistory(transactions) {
    historyContainer.innerHTML = ''; // Xóa nội dung cũ
    const list = document.createElement('ul');
    list.className = 'history-list';

    if (transactions.length === 0) {
        historyContainer.innerHTML = '<p style="color: #aaa; text-align: center; padding: 10px;">Chưa có giao dịch nào.</p>';
        return;
    }

    transactions.forEach(tx => {
        const item = document.createElement('li');
        // **CẢI TIẾN: Thêm onclick để mở Modal chi tiết**
        item.className = 'history-item';
        item.onclick = () => showTransactionDetail(tx.transactionId);

        const isPositive = tx.amount > 0;
        const amountDisplay = formatNumber(Math.abs(tx.originalAmount).toFixed(0)); // Dùng originalAmount để hiển thị
        const statusClass = tx.status || tx.type || 'Success'; // Dùng status/type để làm class

        item.innerHTML = `
            <div class="tx-type-icon ${statusClass}">
                ${isPositive ? '↑' : '↓'}
            </div>
            <div class="tx-info">
                <span class="tx-description">${isPositive ? 'Nhận' : (tx.type === 'Refund' ? 'Hoàn' : (tx.type === 'Fee' ? 'Phí' : 'Chuyển'))} ${amountDisplay} VND</span>
                <span class="tx-summary">ND: ${tx.content.substring(0, 30)}${tx.content.length > 30 ? '...' : ''}</span>
            </div>
            <div class="tx-date-time">
                ${new Date(tx.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                <span class="tx-id-display">${tx.transactionId.substring(0, 10)}...</span>
            </div>
            <div class="tx-status status-${statusClass}">
                ${statusClass === 'Success' ? '✓' : (statusClass === 'Failure' ? '✗' : (statusClass === 'Pending' ? '...' : '?'))}
            </div>
        `;
        list.appendChild(item);
    });
    historyContainer.appendChild(list);
}


// --- HÀM MESSAGE GỬI VỀ TỪ BANK (ĐÃ HOÀN THIỆN) ---
const bankConfigs = {
    'VCB': {
        account: '0000-1111-2222',
        template: (amount, balance, content, time, date, ma_gd, isNegative, partner, accountOwner) => {
            const verb = isNegative ? 'Tru tien cho' : 'nhan duoc';
            // **CẢI TIẾN: Sử dụng Tên Partner/Chủ TK hợp lý hơn trong tin nhắn**
            const from = isNegative ? partner : `tu ${accountOwner} (qua ${partner})`; 
            return ` Quy khach ${verb} ${amount} VND ${isNegative ? '' : from}. ND: ${content}. So du: ${balance} VND. Ref: ${ma_gd}. ${date} ${time}`;
        }
    },
    'TCB': {
        account: '0000-3333-4444',
        template: (amount, balance, content, time, date, ma_gd, isNegative, partner, accountOwner) => {
            return `[TCB] Bien dong so du ${isNegative ? '-' : '+'}${amount} VND. ND: ${content}. So du: ${balance} VND. GD: ${ma_gd}. Thoi gian: ${date} ${time}`;
        }
    },
    'MB': {
        account: '0000-9999-7777',
        template: (amount, balance, content, time, date, ma_gd, isNegative, partner, accountOwner) => {
            return `[MB] Bien dong so du ${isNegative ? '-' : '+'}${amount} VND. ND: ${content}. So du: ${balance} VND. GD: ${ma_gd}. Thoi gian: ${date} ${time}`;
        }
    },
};

/**
 * **HOÀN THIỆN HÀM HIỂN THỊ TIN NHẮN BANK**
 */
function displayBankMessage(amountToProcess, finalBalance, content, transactionId, isNegative) {
    const bankKey = bankSelect.value;
    const bankConfig = bankConfigs[bankKey] || bankConfigs['VCB']; // Default VCB

    const formattedAmount = formatNumber(amountToProcess.toFixed(0));
    const formattedBalance = formatNumber(finalBalance.toFixed(0));
    const contentToDisplay = content.trim();
    const partner = partnerNameInput.value.trim();
    const accountOwner = accountOwnerInput.value.trim();

    const date = getCustomDate().toLocaleDateString('vi-VN');
    const time = getCustomDate().toLocaleTimeString('vi-VN');

    const messageText = bankConfig.template(
        formattedAmount, 
        formattedBalance, 
        contentToDisplay, 
        time, 
        date, 
        transactionId, 
        isNegative, 
        partner,
        accountOwner
    );

    const messageHtml = `
        <div class="bank-message">
            <div class="message-content-wrapper">
                <span>${messageText}</span>
                <button class="message-action-btn" onclick="showTransactionDetail('${transactionId}')">Xem Chi Tiết</button>
            </div>
        </div>
    `;
    messageContainer.innerHTML += messageHtml;
    messageContainer.scrollTop = messageContainer.scrollHeight;
}


function getCustomDate() {
    const datePart = dateInput.value;
    const timePart = timeInput.value;
    // Tạo đối tượng Date với múi giờ hiện tại của trình duyệt.
    return new Date(`${datePart}T${timePart}`);
}

// **CHỈNH SỬA: Hàm formatNumber (Đã có sẵn)**
function formatNumber(numStr) {
    // Xóa tất cả dấu chấm, sau đó định dạng lại.
    const cleaned = numStr.toString().replace(/\D/g, '');
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// **BỔ SUNG: Hàm định dạng số trên input**
function formatInput(input) {
    // 1. Lấy giá trị, loại bỏ mọi ký tự không phải số
    let value = input.value.replace(/\D/g, '');
    // 2. Định dạng lại
    if (value) {
        input.value = formatNumber(value);
    } else {
        input.value = '';
    }
    // Gán giá trị gốc (không định dạng) vào một thuộc tính data-original-value để dễ xử lý.
    input.setAttribute('data-original-value', value);
}

function generateTransactionID() {
    const timestamp = new Date().getTime().toString(16);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `GD${timestamp.toUpperCase()}${random}`;
}

function setDefaultDateTime() {
    // Lấy thời gian hiện tại
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; // Lấy giờ và phút thôi
    dateInput.value = dateStr;
    timeInput.value = timeStr;
    
    // **BỔ SUNG: Định dạng lại số tiền mặc định 100000**
    amountInput.value = formatNumber('100000');
    amountInput.setAttribute('data-original-value', '100000');
}

/**
 * **ĐỊNH NGHĨA HÀM KHỞI TẠO (HOÀN THIỆN)**
 */
async function initializeApp() {
    // Gắn sự kiện cho input số tiền và hạn mức
    amountInput.addEventListener('input', () => formatInput(amountInput));
    dailyLimitInput.addEventListener('input', () => formatInput(dailyLimitInput));
    
    await loadBalanceAndDailyTotal();
    setDefaultDateTime();
    await loadTransactionHistory();
    // Gắn sự kiện đóng modal
    document.querySelector('.close-button').onclick = closeModal;
    window.onclick = function(event) {
        if (event.target == detailModal) {
            closeModal();
        }
    };
}


function updateCalculatorState(disabled = false) {
    document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = disabled);
}

async function processTransaction(txType) {
    updateCalculatorState(true); 
    // **CHỈNH SỬA: Lấy giá trị SỐ GỐC từ input**
    const amountStr = amountInput.getAttribute('data-original-value') || amountInput.value.replace(/\D/g, '');
    const amountToProcess = parseFloat(amountStr);
    const isNegative = (txType === 'refund' || txType === 'failure' || txType === 'fee'); // Thêm 'fee'
    const delaySeconds = parseInt(delayInput.value) || 0;
    const simulatedStatus = simulatedStatusSelect.value;
    const refundId = refundIdInput.value.trim();
    let transactionId = generateTransactionID();
    let transactionAmount = isNegative ? -amountToProcess : amountToProcess;
    let partnerName = partnerNameInput.value.trim() || 'GATEWAY_ID';
    let accountOwner = accountOwnerInput.value.trim() || 'NGUYEN VAN A';
    let tags = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
    const errorCode = errorCodeInput.value.trim() || "E999_SYSTEM_ERROR";
    const defaultContent = defaultContentTemplate.value.trim() || 'Thanh toan don hang {TX_ID}';
    let transactionContent = contentInput.value.trim();

    // **SỬA LỖI: Luôn cập nhật nội dung nếu để trống**
    if (!transactionContent) { 
        transactionContent = defaultContent.replace('{TX_ID}', transactionId);
    }

    if (isNaN(amountToProcess) || amountToProcess <= 0) {
        messageContainer.innerHTML += `<div class="system-message">❌ Số tiền giao dịch không hợp lệ!</div>`;
        messageContainer.scrollTop = messageContainer.scrollHeight;
        updateCalculatorState(false);
        amountInput.value = formatNumber('100000');
        amountInput.setAttribute('data-original-value', '100000');
        return;
    }

    if (txType === 'payment' || txType === 'refund' || txType === 'fee') { // Chỉ kiểm tra với 3 loại này
        // Kiểm tra hạn mức hàng ngày
        const dailyLimit = parseFloat(dailyLimitInput.getAttribute('data-original-value') || '0');
        if ((txType === 'payment' || txType === 'refund' || txType === 'fee') && dailyLimit > 0 && dailyTransactionTotal + amountToProcess > dailyLimit) {
            messageContainer.innerHTML += `<div class="system-message">⚠️ Giao dịch vượt quá hạn mức tối đa trong ngày (${formatNumber(dailyLimit.toFixed(0))} VND). Đã mô phỏng thất bại.</div>`;
            updateCalculatorState(false);
            return;
        }

        // Kiểm tra số dư cho giao dịch trừ tiền
        if (isNegative && currentBalance - amountToProcess < 0) {
             messageContainer.innerHTML += `<div class="system-message">⚠️ Giao dịch trừ tiền/hoàn tiền không thể thực hiện vì **số dư không đủ** (${formatNumber(currentBalance.toFixed(0))} VND). Đã mô phỏng thất bại.</div>`;
             updateCalculatorState(false);
             return;
        }
    }
    
    // Thông báo độ trễ
    if (delaySeconds > 0) {
         messageContainer.innerHTML += `<div class="transaction-delay">⏳ Mô phỏng độ trễ **${delaySeconds} giây**. Vui lòng chờ...</div>`;
         messageContainer.scrollTop = messageContainer.scrollHeight;
    } else {
        messageContainer.innerHTML += `<div class="system-message">⚙️ Đang xử lý giao dịch **${transactionId}**...</div>`;
         messageContainer.scrollTop = messageContainer.scrollHeight;
    }


    setTimeout(async () => {
        let finalStatusMessage = '';
        let newBalance = currentBalance;
        
        const transactionData = {
            transactionId: transactionId,
            timestamp: getCustomDate().getTime(), // Lấy timestamp tùy chỉnh
            date: dateInput.value,
            time: timeInput.value,
            amount: transactionAmount, // Dùng số có dấu
            originalAmount: amountToProcess, // Dùng số dương không dấu
            bank: bankSelect.value,
            sourceType: sourceTypeSelect.value,
            type: txType.charAt(0).toUpperCase() + txType.slice(1), // Payment, Refund, Fee
            content: transactionContent,
            partner: partnerName,
            accountOwner: accountOwner, 
            status: simulatedStatus, // Thêm trạng thái mô phỏng
            tags: tags,
            refundId: refundId // Thêm thông tin Refund ID
        };
        
        // --- XỬ LÝ TRẠNG THÁI MÔ PHỎNG ---
        if (simulatedStatus === 'Success') {
            newBalance = currentBalance + transactionAmount;
            
            // Đã kiểm tra số dư ở trên, chỉ cần cập nhật nếu thành công
            finalStatusMessage = `✅ Giao dịch **${transactionId}** thành công! Số dư mới: ${formatNumber(newBalance.toFixed(0))} VND.`;
            currentBalance = parseFloat(newBalance.toFixed(2));
            await saveBalanceAndDailyTotal(currentBalance, transactionAmount);
            updateBalanceDisplay();
            
            // Cập nhật amount và finalBalance trước khi lưu
            transactionData.amount = transactionAmount; 
            transactionData.finalBalance = currentBalance; 
            await saveTransaction(transactionData);
            displayBankMessage(amountToProcess, currentBalance, transactionContent, transactionId, isNegative);
            loadTransactionHistory();
            
        } else if (simulatedStatus === 'Failure') {
            finalStatusMessage = `❌ Giao dịch **${transactionId}** thất bại! Mã lỗi: **${errorCode}**.`;
            // Không thay đổi số dư
            transactionData.amount = 0;
            transactionData.status = 'Failure';
            transactionData.tags = [...tags, `error:${errorCode}`];
            transactionData.errorCode = errorCode;
            transactionData.finalBalance = currentBalance; // Số dư không đổi
            await saveTransaction(transactionData);
        } else if (simulatedStatus === 'Pending') {
            finalStatusMessage = `⚠️ Giao dịch **${transactionId}** đang chờ xử lý.`;
            // Không thay đổi số dư
            transactionData.amount = 0;
            transactionData.status = 'Pending';
            transactionData.tags = [...tags, 'pending'];
            transactionData.finalBalance = currentBalance; // Số dư không đổi
            await saveTransaction(transactionData);
        }

        messageContainer.innerHTML += `<div class="system-message">${finalStatusMessage}</div>`;
        messageContainer.scrollTop = messageContainer.scrollHeight;
        updateCalculatorState(false);
        simulatedStatusSelect.value = 'Success'; // Reset trạng thái mô phỏng
        amountInput.value = formatNumber('100000'); // Reset số tiền và định dạng lại
        amountInput.setAttribute('data-original-value', '100000');
        refundIdInput.value = '';
    }, delaySeconds * 1000);
}

function simulateFailure() {
    simulatedStatusSelect.value = 'Failure';
    // Sửa lỗi: Lấy transactionTypeSelect.value.toLowerCase() là không đúng nếu đang là Refund, phải gọi processTransaction với type đã chọn
    processTransaction(transactionTypeSelect.value.toLowerCase());
}

// **CẢI TIẾN: Thêm hàm mô phỏng Pending**
function simulatePending() {
    simulatedStatusSelect.value = 'Pending';
    // Sửa lỗi: Lấy transactionTypeSelect.value.toLowerCase() là không đúng nếu đang là Refund, phải gọi processTransaction với type đã chọn
    processTransaction(transactionTypeSelect.value.toLowerCase());
}

// **CẢI TIẾN: Hàm gọi nhanh cho các loại GD chính**
function simulatePayment() {
    processTransaction('payment');
}

function simulateRefund() {
    processTransaction('refund');
}

function simulateFee() {
    processTransaction('fee');
}


// --- HÀM XUẤT DỮ LIỆU (ĐÃ HOÀN THIỆN) ---

/**
 * **HOÀN THIỆN HÀM CHUYỂN JSON SANG CSV**
 */
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    // Sử dụng tất cả các keys từ object đầu tiên làm headers
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Headers
    csvRows.push(headers.join(','));
    
    // Rows
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            // Xử lý giá trị chứa dấu phẩy (CSV standard)
            const escaped = ('' + value).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

async function exportTransactions() {
    try {
        messageContainer.innerHTML += `<div class="system-message">⏳ Đang đọc dữ liệu giao dịch...</div>`;
        messageContainer.scrollTop = messageContainer.scrollHeight;
        const db = await openDatabase();
        const transaction = db.transaction(STORE_TRANSACTIONS, 'readonly');
        const store = transaction.objectStore(STORE_TRANSACTIONS);
        const transactions = [];
        // Đọc toàn bộ giao dịch, không giới hạn 10
        const request = store.index('timestamp').openCursor(null, 'prev');
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                transactions.push(cursor.value);
                cursor.continue();
            } else {
                if (transactions.length === 0) {
                    messageContainer.innerHTML += `<div class="system-message">⚠️ Không có giao dịch nào để xuất.</div>`;
                    messageContainer.scrollTop = messageContainer.scrollHeight;
                    return;
                }
                const csvContent = convertToCSV(transactions);
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.setAttribute('href', url);
                a.setAttribute('download', `transactions_export_${new Date().toISOString().slice(0, 10)}.csv`);
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                messageContainer.innerHTML += `<div class="system-message">💾 Xuất dữ liệu **${transactions.length}** giao dịch thành công!</div>`;
                messageContainer.scrollTop = messageContainer.scrollHeight;
            }
        };
        request.onerror = (event) => {
            console.error("Lỗi khi đọc dữ liệu GD:", event.target.error);
        };
    } catch (e) {
        console.error("Lỗi khi xuất dữ liệu:", e);
    }
}


// --- HÀM XỬ LÝ MODAL/QR VÀ XÓA TIN NHẮN ---

/**
 * Hiển thị Modal chi tiết giao dịch. **CẢI TIẾN: Hiển thị dữ liệu chi tiết**
 */
async function showTransactionDetail(transactionId) {
    const tx = await findTransaction(transactionId);
    if (!tx) {
        detailContent.innerHTML = '<p style="color: var(--refund-bg);">Không tìm thấy thông tin giao dịch!</p>';
        qrCodeDisplay.innerHTML = '<p>Lỗi</p>';
        detailModal.style.display = 'block';
        return;
    }
    
    // Cập nhật Tiêu đề
    detailModalTitle.textContent = `Chi Tiết Giao Dịch: ${tx.transactionId}`;

    // Lấy config Bank để hiển thị Tên Bank và Số TK
    const bankConfig = bankConfigs[tx.bank] || { account: 'N/A', name: tx.bank }; 
    const isSuccess = tx.status === 'Success';
    const amountSign = tx.amount > 0 ? '+' : (tx.amount < 0 ? '-' : '');
    const amountColor = tx.amount > 0 ? 'var(--payment-color)' : (tx.amount < 0 ? 'var(--refund-color)' : 'var(--text-color)');
    
    // Cập nhật các trường thông tin chi tiết
    modalTxId.textContent = tx.transactionId;
    modalBankAcc.textContent = bankConfig.account;
    modalBankName.textContent = bankConfig.name || tx.bank;
    modalAmount.innerHTML = `<span style="color: ${amountColor}">${amountSign}${formatNumber(Math.abs(tx.originalAmount).toFixed(0))} VND</span>`;
    modalContent.textContent = tx.content;
    modalStatus.textContent = tx.status;
    modalStatus.className = `detail-value status-${tx.status}`; // Thêm class màu sắc
    modalTime.textContent = new Date(tx.timestamp).toLocaleString('vi-VN');

    // Cập nhật nội dung QR giả lập
    const qrText = `GiaoDich: ${tx.transactionId}|Amount: ${tx.originalAmount}|Status: ${tx.status}|Time: ${tx.timestamp}|Partner: ${tx.partner}`;
    qrCodeDisplay.innerHTML = `
        <div class="qr-code-placeholder" title="QR Code Giả Lập">
            <p>QR Code</p>
            <p style="font-size: 10px; color: #888;">(Giả lập)</p>
            <p style="font-size: 8px; color: #555;">(Click để xem/copy nội dung)</p>
        </div>
    `;
    // **BỔ SUNG: Cho phép copy nội dung QR code**
    modalQrContent.textContent = qrText;
    
    detailModal.style.display = 'block';
}

/**
 * Đóng Modal.
 */
function closeModal() {
    detailModal.style.display = 'none';
}

/**
 * Xóa lịch sử tin nhắn trong Message Panel.
 */
function clearMessages() {
    if (confirm("Bạn có chắc chắn muốn xóa TOÀN BỘ lịch sử tin nhắn hiển thị không?")) {
        messageContainer.innerHTML = '<p class="system-message">✅ Đã xóa lịch sử tin nhắn. Cấu hình thông số và thực hiện lệnh giao dịch mới.</p>';
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }
}


// --- HÀM XÓA & RESET DỮ LIỆU (ĐÃ HOÀN THIỆN) ---
async function clearAllDataAndReset() {
    if (!confirm("Bạn có chắc chắn muốn XÓA TOÀN BỘ lịch sử giao dịch và reset Số dư (về 0) không? Hành động này không thể hoàn tác.")) {
        return;
    }

    try {
        const db = await openDatabase();
        // Xóa Transaction Store
        const txStore = db.transaction(STORE_TRANSACTIONS, 'readwrite');
        txStore.objectStore(STORE_TRANSACTIONS).clear();
        await new Promise(resolve => txStore.oncomplete = resolve);

        // Reset Balance Store
        await saveValue(STORE_BALANCE, BALANCE_KEY, 0.00);
        await saveValue(STORE_BALANCE, DAILY_TOTAL_KEY, { date: new Date().toDateString(), total: 0 });

        // Reset biến cục bộ
        currentBalance = 0.00;
        dailyTransactionTotal = 0.00;
        
        // Cập nhật UI
        updateBalanceDisplay();
        loadTransactionHistory();
        clearMessages(); // Xóa tin nhắn hiển thị

        messageContainer.innerHTML += '<p class="system-message success">🎉 Đã XÓA TOÀN BỘ DỮ LIỆU và RESET số dư thành công!</p>';
        messageContainer.scrollTop = messageContainer.scrollHeight;

    } catch (e) {
        console.error("Lỗi khi xóa dữ liệu:", e);
        messageContainer.innerHTML += '<p class="system-message error">❌ Lỗi: Không thể xóa dữ liệu IndexedDB.</p>';
         messageContainer.scrollTop = messageContainer.scrollHeight;
    }
}


// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
    // Đảm bảo nút xóa/reset sử dụng hàm mới
    const resetButton = document.querySelector('.action-btn[onclick*="clearAllDataAndReset"]');
    if (resetButton) {
        resetButton.onclick = clearAllDataAndReset;
    }

    updatePinDisplay();
    
    // Gán các hàm vào Window để dùng trong onclick
    window.processTransaction = processTransaction;
    window.simulateFailure = simulateFailure;
    window.simulatePending = simulatePending; // Thêm hàm mới
    window.simulatePayment = simulatePayment;
    window.simulateRefund = simulateRefund;
    window.simulateFee = simulateFee;
    window.exportTransactions = exportTransactions;
    window.enterPin = enterPin;
    window.deletePin = deletePin;
    window.checkPassword = checkPassword;
    window.clearAllDataAndReset = clearAllDataAndReset; // Đảm bảo hàm reset được gán đúng
    window.clearMessages = clearMessages; // Đảm bảo hàm xóa tin nhắn được gán đúng
    window.showTransactionDetail = showTransactionDetail; // Thêm hàm show modal
    window.closeModal = closeModal; // Thêm hàm đóng modal
    window.formatInput = formatInput; // Thêm hàm format input cho các trường cần định dạng
    
    // Tự động gọi initializeApp nếu không dùng màn hình khóa (chế độ Dev/Test)
    if (lockScreen.style.display === 'none' || lockScreen.classList.contains('hidden')) {
        initializeApp();
    }
});