/**
 * NMT VIP BO - JAVASCRIPT CORE (VERSION 5.0 - KHÔNG LOCALSTORAGE - BOT CLOUD)
 */

const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbypWHtNHG5Svb6GkaAddQzwtxdShbJkPN_IYLKQEDJjgN71LAI-_6plLg-RJTsLEgsDpw/exec"; // THAY LINK CỦA BẠN VÀO ĐÂY
const EXCHANGE_RATE = 25000;

const urlParams = new URLSearchParams(window.location.search);
const playerId = urlParams.get('id');

let state = {
    usdBalance: 0.00,
    realizedPnL: 0,
    history: [],
    dotHistory: [],
    winStreak: 0,
    currentStreakType: null,
    totalVolume: 0
};

let currentPrice = 100.00;
let volatility = 0;
let isBoRunning = false;
let currentBetDirection = null;
let betEntryPrice = 0;
let activeAIPrediction = null;

let isAdminAuthed = false; 

const winSound = new Audio('https://quicksounds.com/uploads/tracks/1149463990_1215160074_1349386407.mp3');
const loseSound = new Audio('https://www.myinstants.com/media/sounds/wrong-answer-sound-effect.mp3');
const fakeNames = ["Nguyễn Hải", "Trần Tuấn", "Lê Nam", "Phạm Quân", "Hoàng Linh", "Vũ Thảo", "Đặng Long", "Bùi Phát", "Võ Cường", "Phan Anh"];

if (playerId) {
    document.getElementById('user-display').innerText = playerId;
    syncFromCloud();
    setInterval(simulateMarket, 1000);
    setInterval(generateFakeBet, 2500); 
    setInterval(fetchCloudBot, 3000);   
}

// ----------------------------------------------------
// 1. GIAO TIẾP VỚI GOOGLE SHEETS
// ----------------------------------------------------
async function syncFromCloud() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "GET_BALANCE", id: playerId })
        });
        const data = await response.json();
        
        if (data.status === "success") {
            // 1. Cập nhật số dư từ Cloud
            state.usdBalance = parseFloat(data.balance) || 0;
            
            // 2. Cập nhật tổng Volume từ Cloud để đồng bộ VIP trên mọi thiết bị
            state.totalVolume = parseFloat(data.totalVolume) || 0;
            
            // 3. Nhận mảng giọt nước từ Cloud
            if (data.dotHistory) {
                state.dotHistory = data.dotHistory;
            }

            // 4. Nhận lịch sử giao dịch gần đây
            if (data.history) {
                state.history = data.history;
            }
            
            // 5. Làm mới toàn bộ giao diện (Số dư, VIP, Lịch sử)
            updateUI();
            console.log("Đồng bộ Cloud thành công. Volume:", state.totalVolume);
        }
    } catch (e) {
        console.warn("Lỗi tải dữ liệu từ Cloud, đang thử lại...");
    }
}

async function sendToGoogleSheets(tradeAction, amount, result, profit_loss, balance, note) {
    const payload = {
        action: "SAVE_TRANSACTION",
        id: playerId,
        time: new Date().toLocaleString("vi-VN"),
        tradeAction: tradeAction,
        amount: amount,
        result: result,
        pnl: profit_loss,
        balance: balance,
        note: note
    };

    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error("Lỗi ghi lịch sử:", err);
    }
}

// ----------------------------------------------------
// 2. MÔ PHỎNG THỊ TRƯỜNG & AI & FAKE BET
// ----------------------------------------------------
let cloudBotDirection = "UP"; 

async function fetchCloudBot() {
    try {
        const res = await fetch(GOOGLE_SHEET_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "GET_BOT_SIGNAL" })
        });
        const data = await res.json();
        
        if (data.status === "success" && data.signal) {
            cloudBotDirection = data.signal; 
            const resultBox = document.getElementById('ai-result');
            if (resultBox && resultBox.style.display === 'block') {
                const isUp = cloudBotDirection === 'UP';
                resultBox.innerHTML = `🔥 AI Đám Mây: <strong style="color:${isUp ? 'var(--green)' : 'var(--red)'}">${isUp ? 'TĂNG 📈' : 'GIẢM 📉'}</strong><br><span style="color:var(--text-muted); font-size: 11px;">(Đồng bộ toàn cầu)</span>`;
            }
        }
    } catch (e) { 
        console.warn("Lỗi kết nối Cloud Bot"); 
    }
}

function generateFakeBet() {
    if (Math.random() > 0.4 || isBoRunning) return;
    const name = fakeNames[Math.floor(Math.random() * fakeNames.length)] + "***";
    const amount = (Math.random() * 800 + 50).toFixed(0);
    const feed = document.getElementById('live-feed');
    if (!feed) return;
    const item = document.createElement('div');
    item.className = 'feed-item';
    item.innerHTML = `<strong>${name}</strong> cược <span style="color:var(--accent)">$${amount}</span> 💸`;
    feed.prepend(item);
    if (feed.children.length > 10) feed.lastChild.remove();
}

function simulateMarket() {
    volatility = (Math.random() - 0.5) * 0.2;
    if (isBoRunning && cloudBotDirection) {
        if (cloudBotDirection === 'UP') {
            volatility = Math.abs(volatility) + 0.03; 
        } else {
            volatility = -Math.abs(volatility) - 0.03; 
        }
    }
    currentPrice += volatility;
    updateOrderBook();
}

function updateOrderBook() {
    const hp = document.getElementById('header-price');
    if (hp) hp.innerText = currentPrice.toFixed(2);
    const obPriceEl = document.getElementById('ob-price');
    if (obPriceEl) {
        obPriceEl.innerText = currentPrice.toFixed(2);
        obPriceEl.className = (volatility > 0) ? 'ob-current-price price-up' : 'ob-current-price price-down';
    }
}

// ----------------------------------------------------
// 3. LOGIC GIAO DỊCH BO
// ----------------------------------------------------
async function placeBO(direction) {
    if (isBoRunning) return;
    const betAmount = parseFloat(document.getElementById('bo-amount').value);

    if (isNaN(betAmount) || betAmount < 1) return alert("Cược tối thiểu $1");
    if (betAmount > state.usdBalance) return alert("Số dư trên Cloud không đủ!");

    isBoRunning = true;
    currentBetDirection = direction;
    betEntryPrice = currentPrice;
    state.usdBalance -= betAmount; 

    document.querySelectorAll('.btn-huge, .btn-predict').forEach(b => b.disabled = true);
    
    const progressBar = document.getElementById('countdown-bar');
    progressBar.style.transition = 'none';
    progressBar.style.width = '100%';
    setTimeout(() => {
        progressBar.style.transition = 'width 5s linear';
        progressBar.style.width = '0%';
    }, 50);

    let timeLeft = 5;
    const countdown = setInterval(() => {
        timeLeft--;
        document.getElementById('bo-status').innerHTML = `Kết quả sau: ${timeLeft}s<br>Vào lệnh: ${betEntryPrice.toFixed(2)}`;
        if (timeLeft <= 0) {
            clearInterval(countdown);
            resolveBO(direction, betAmount, betEntryPrice);
        }
    }, 1000);
    updateUI();
}

function resolveBO(direction, betAmount, entryPrice) {
    const exitPrice = currentPrice;
    let isWin = false, isTie = false, resultText = 'HÒA', profit = 0;

    if (exitPrice > entryPrice) {
        state.dotHistory.push('up');
        if (direction === 'UP') isWin = true;
    } else if (exitPrice < entryPrice) {
        state.dotHistory.push('down');
        if (direction === 'DOWN') isWin = true;
    } else {
        state.dotHistory.push('tie');
        isTie = true;
    }

    if (state.dotHistory.length > 56) state.dotHistory.shift();
    let note = activeAIPrediction ? "Bot AI: " + activeAIPrediction : "Cược tay";

    if (isWin) {
        winSound.play().catch(e => {});
        profit = betAmount * 0.95;
        state.usdBalance += (betAmount + profit);
        state.realizedPnL += profit;
        resultText = "THẮNG";
        showFloatingText(`+$${profit.toFixed(2)}`, 'var(--green)');
    } else if (isTie) {
        state.usdBalance += betAmount;
        resultText = "HÒA";
    } else {
        loseSound.play().catch(e => {});
        profit = -betAmount;
        state.realizedPnL -= betAmount;
        resultText = "THUA";
        showFloatingText(`-$${betAmount}`, 'var(--red)');
    }

    state.history.unshift({ action: direction, amount: profit, price: entryPrice, result: resultText, time: new Date().toLocaleTimeString() });
    state.totalVolume += betAmount;

    sendToGoogleSheets(`Cược ${direction}`, betAmount, resultText, profit.toFixed(2), state.usdBalance.toFixed(2), note);

    isBoRunning = false;
    activeAIPrediction = null;
    document.querySelectorAll('.btn-huge, .btn-predict').forEach(b => b.disabled = false);
    document.getElementById('bo-status').innerHTML = "ĐANG CHỜ LỆNH...";
    updateUI();
}

// ----------------------------------------------------
// 4. CẬP NHẬT GIAO DIỆN & CẤP ĐỘ VIP FULL 10 CẤP (Cập nhật đồng bộ Cloud)
// ----------------------------------------------------
function updateUI() {
    const fmt = (n) => "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    // Cập nhật số dư 
    document.getElementById('usd-balance').innerText = fmt(state.usdBalance);
    document.getElementById('total-asset').innerText = fmt(state.usdBalance);

    // Cập nhật PnL 
    const pnlEl = document.getElementById('realized-pnl');
    if (pnlEl) {
        pnlEl.innerText = fmt(state.realizedPnL);
        pnlEl.style.color = state.realizedPnL >= 0 ? 'var(--green)' : 'var(--red)';
    }

    // Cấu trúc phân cấp VIP 
    const vipLevels = [
        { name: "VIP 0", min: 0, color: "var(--text-muted)" },
        { name: "VIP 1 (Đồng)", min: 1000, color: "#cd7f32" },
        { name: "VIP 2 (Bạc)", min: 10000, color: "#c0c0c0" },
        { name: "VIP 3 (Vàng)", min: 20000, color: "var(--accent)" },
        { name: "VIP 4 (Bạch Kim)", min: 50000, color: "#dda0dd" },
        { name: "VIP 5 (Kim Cương)", min: 100000, color: "#00ffff" },
        { name: "VIP 6 (Tinh Anh)", min: 500000, color: "#00fa9a" },
        { name: "VIP 7 (Thách Đấu)", min: 1000000, color: "#ffd700" },
        { name: "VIP 8 (Huyền Thoại)", min: 10000000, color: "#ff8c00" },
        { name: "VIP 9 (Chúa Tể)", min: 100000000, color: "#ff4500" },
        { name: "VIP MAX", min: 1000000000, color: "#ff00ff" }
    ];

    const vol = state.totalVolume; // Volume này được đồng bộ từ Cloud 
    let currentVip = vipLevels[0];
    let nextVip = vipLevels[1];

    // Xác định cấp độ VIP hiện tại và tiếp theo 
    for (let i = 0; i < vipLevels.length; i++) {
        if (vol >= vipLevels[i].min) {
            currentVip = vipLevels[i];
            nextVip = vipLevels[i + 1] ? vipLevels[i + 1] : null;
        }
    }

    // Tính % tiến trình lên VIP 
    let progressPercent = 0;
    if (nextVip) {
        progressPercent = ((vol - currentVip.min) / (nextVip.min - currentVip.min)) * 100;
    } else {
        progressPercent = 100; // Đã đạt VIP MAX
    }

    // Cập nhật Logo và Thanh tiến trình VIP 
    const logoEl = document.querySelector('.logo');
    if (logoEl) {
        logoEl.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
                <div style="margin-bottom: 2px;">💎 NMT BO - <span style="color:${currentVip.color}; font-size:12px; font-weight:bold;">${currentVip.name}</span></div>
                <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; position: relative; overflow: hidden;">
                    <div style="width: ${progressPercent}%; height: 100%; background: ${currentVip.color}; transition: width 0.5s ease-in-out;"></div>
                </div>
                ${nextVip ? `<small style="font-size: 8px; color: var(--text-muted); margin-top: 2px;">Cần ${fmt(nextVip.min - vol)} để lên ${nextVip.name}</small>` : ''}
            </div>
        `;
    }

    // Cập nhật Giọt nước (Lịch sử kết quả) 
    const dotContainer = document.getElementById('dot-history');
    if (dotContainer) {
        dotContainer.innerHTML = state.dotHistory.map(d => `<div class="dot ${d}"></div>`).join('');
    }

    // Cập nhật Danh sách Lịch sử giao dịch 
    const histBody = document.getElementById('history-body');
    if (histBody) {
        histBody.innerHTML = state.history.slice(0, 15).map(h => `
            <div class="hist-item ${h.result === 'THẮNG' ? 'win' : (h.result === 'THUA' ? 'loss' : '')}">
                <div class="hist-left">
                    <strong>${h.action}</strong>
                    <small>${h.time}</small>
                </div>
                <div class="hist-right" style="color: ${h.amount >= 0 ? 'var(--green)' : 'var(--red)'}">
                    ${h.amount >= 0 ? '+' : ''}${h.amount.toFixed(2)}
                </div>
            </div>
        `).join('');
    }
}

function showFloatingText(text, color) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.style.color = color; el.innerText = text;
    const container = document.getElementById('floating-container');
    if (container) container.appendChild(el);
    setTimeout(() => el.remove(), 2000);
}

// ----------------------------------------------------
// 5. CÁC TÍNH NĂNG NỘI BỘ (ĐÃ KHÓA MẬT KHẨU)
// ----------------------------------------------------

// --- Khóa Nạp Tiền ---
function checkAdminBeforeDeposit() {
    if (isAdminAuthed) {
        openDepositModal();
    } else {
        document.getElementById('admin-secret-key').value = '';
        document.getElementById('admin-auth-modal').style.display = 'flex';
    }
}

function verifyAdminKey() {
    const key = document.getElementById('admin-secret-key').value;
    if (key === "adminnap") {
        document.getElementById('admin-auth-modal').style.display = 'none';
        isAdminAuthed = true;
        openDepositModal();
    } else {
        alert("❌ Mật khẩu quản trị sai!");
    }
}

// --- Khóa Rút Tiền / Ngân Hàng (Mới Thêm) ---
function checkAdminBeforeBanking() {
    document.getElementById('banking-secret-key').value = '';
    document.getElementById('banking-auth-modal').style.display = 'flex';
}

function verifyBankingKey() {
    const key = document.getElementById('banking-secret-key').value;
    if (key === "adminrut") {
        document.getElementById('banking-auth-modal').style.display = 'none';
        window.location.href = 'banking.html?id=' + playerId;
    } else {
        alert("❌ Mật khẩu ngân hàng sai!");
    }
}

// --- Khóa Bot AI ---
function checkBotAIAccess() {
    document.getElementById('ai-secret-key').value = '';
    document.getElementById('ai-auth-modal').style.display = 'flex';
}

function verifyAIPassword() {
    const key = document.getElementById('ai-secret-key').value;
    if (key === "botvip2026") {
        document.getElementById('ai-auth-modal').style.display = 'none';
        
        // GỌI HÀM PHÂN TÍCH ĐỂ HIỂN THỊ KẾT QUẢ TRỰC TIẾP TRÊN MÀN HÌNH
        getAIPrediction(); 
    } else {
        alert("❌ Mã kích hoạt không hợp lệ!");
    }
}

function getAIPrediction() {
    if (isBoRunning) return;
    const btn = document.querySelector('.btn-predict');
    const resultBox = document.getElementById('ai-result');

    btn.disabled = true;
    btn.innerHTML = "⏳ Đang quét khối lượng giao dịch...";
    resultBox.style.display = 'block';
    resultBox.innerHTML = "Đang kết nối siêu máy tính...";

    setTimeout(() => {
        btn.innerHTML = "🤖 Phân Tích Lại";
        btn.disabled = false;
        const isUp = cloudBotDirection === 'UP';
        resultBox.innerHTML = `🔥 AI khuyên: <strong style="color:${isUp ? 'var(--green)' : 'var(--red)'}">${isUp ? 'TĂNG 📈' : 'GIẢM 📉'}</strong><br><span style="color:var(--text-muted); font-size: 11px;">(Đồng bộ toàn cầu)</span>`;
    }, 1500);
}

// Modal Nạp tiền xử lý
function openDepositModal() { document.getElementById('deposit-modal').style.display = 'flex'; backToStep1(); }
function closeDepositModal() { document.getElementById('deposit-modal').style.display = 'none'; }
function calculateVND() {
    const usd = document.getElementById('deposit-amount').value;
    document.getElementById('vnd-preview').innerText = (usd * EXCHANGE_RATE).toLocaleString() + " ₫";
}
function goToDepositStep2() {
    const usd = parseFloat(document.getElementById('deposit-amount').value);
    if (isNaN(usd) || usd < 10) return alert("Vui lòng nạp tối thiểu $10");
    const vndAmount = usd * EXCHANGE_RATE;
    const memo = "NAP" + Math.floor(1000 + Math.random() * 9000) + playerId;
    
    document.getElementById('qr-vnd-amount').innerText = vndAmount.toLocaleString() + " ₫";
    document.getElementById('qr-memo').innerText = memo;
    document.getElementById('qr-image').src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=STK:123456789|Amount:${vndAmount}|Memo:${memo}`;
    
    document.getElementById('deposit-step-1').style.display = 'none';
    document.getElementById('deposit-step-2').style.display = 'block';
}
function backToStep1() {
    document.getElementById('deposit-step-1').style.display = 'block';
    document.getElementById('deposit-step-2').style.display = 'none';
    document.getElementById('deposit-loader').style.display = 'none';
}
function processDeposit() {
    const usd = parseFloat(document.getElementById('deposit-amount').value);
    document.getElementById('btn-confirm-deposit').disabled = true;
    document.getElementById('deposit-loader').style.display = 'block';

    setTimeout(() => {
        state.usdBalance += usd;
        state.history.unshift({ action: 'NẠP TIỀN', amount: usd, price: '-', result: 'THÀNH CÔNG', time: new Date().toLocaleTimeString() });
        
        sendToGoogleSheets("NẠP TIỀN", usd, "THÀNH CÔNG", `+${usd}`, state.usdBalance.toFixed(2), "Chuyển khoản QR");
        
        updateUI();
        closeDepositModal();
        showFloatingText(`+$${usd}`, 'var(--green)');
        document.getElementById('btn-confirm-deposit').disabled = false;
    }, 2000);
}

// ----------------------------------------------------
// 6. CÁC HÀM TIỆN ÍCH & ĐIỀU KHIỂN GIAO DIỆN
// ----------------------------------------------------

/**
 * Hàm đặt số tiền cược nhanh
 * Cải tiến: Cộng dồn giá trị khi bấm nhiều lần, hỗ trợ mốc từ $10 - $1000
 */
function setQuickBet(amt) {
    let currentInput = document.getElementById('bo-amount');
    let currentVal = parseFloat(currentInput.value) || 0;
    
    if (amt === 'ALL') {
        // Cược toàn bộ số dư khả dụng (làm tròn xuống)
        currentInput.value = Math.floor(state.usdBalance);
    } 
    else if (amt === 'CLEAR') {
        // Xóa trắng số tiền về 0
        currentInput.value = 0;
    } 
    else {
        // Thực hiện cộng dồn (Ví dụ: bấm 200 + 500 = 700)
        currentInput.value = currentVal + amt;
    }
    
    // Cập nhật lại con số lợi nhuận dự kiến ngay lập tức
    updateExpectedProfit();
}

/**
 * Tính toán lợi nhuận dự kiến (95%) hiển thị trên giao diện
 */
function updateExpectedProfit() {
    const amt = parseFloat(document.getElementById('bo-amount').value) || 0;
    const profit = amt * 1.95; // Gốc + 95% lãi
    document.getElementById('expected-profit-text').innerText = "$" + profit.toLocaleString(undefined, { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
    });
}

/**
 * Chuyển đổi giữa các Tab (Lịch sử / Live Feed) ở cột trái
 */
function switchSidebarTab(tabId, event) {
    // Loại bỏ class active của tất cả các tab và nội dung
    document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
    
    // Kích hoạt tab được nhấn
    event.currentTarget.classList.add('active');
    document.getElementById(`tab-${tabId}`).classList.add('active');
}

/**
 * Khôi phục số dư từ Cloud (Dùng khi có sự cố đồng bộ)
 */
function resetAccount() {
    if (confirm("Khôi phục số dư thực tế từ máy chủ đám mây?")) {
        syncFromCloud();
    }
}

/**
 * Đăng xuất và đẩy người dùng về trang login
 */
function logOut() {
    // Xóa ID trên URL và chuyển hướng
    window.location.replace('login.html');
}
// --- XÓA TÀI KHOẢN VÀ DỮ LIỆU ---

// Hàm băm mật khẩu SHA-256
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function openDeleteAccountModal() {
    document.getElementById('delete-secret-key').value = '';
    document.getElementById('delete-account-modal').style.display = 'flex';
}

async function processDeleteAccount() {
    const pass = document.getElementById('delete-secret-key').value.trim();
    if (!pass) return alert("Vui lòng nhập mật khẩu!");

    // Cảnh báo lần cuối
    if (!confirm("HÀNH ĐỘNG NÀY KHÔNG THỂ KHÔI PHỤC!\nBạn có chắc chắn muốn xóa sạch dữ liệu của ID: " + playerId + " không?")) return;

    const btn = document.getElementById('btn-confirm-delete');
    btn.innerText = "Đang xóa...";
    btn.disabled = true;

    // Băm mật khẩu người dùng vừa nhập
    const hashedPass = await sha256(pass);

    try {
        const response = await fetch(GOOGLE_SHEET_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ 
                action: "DELETE_ACCOUNT", 
                id: playerId, 
                pass: hashedPass 
            })
        });
        const data = await response.json();

        if (data.status === "success") {
            alert("✅ Đã xóa tài khoản và toàn bộ dữ liệu thành công!");
            window.location.replace('login.html'); // Đẩy về trang đăng nhập
        } else {
            alert("❌ Lỗi: " + data.message);
            btn.innerText = "XÓA NGAY";
            btn.disabled = false;
        }
    } catch (e) {
        alert("Lỗi kết nối máy chủ Cloud!");
        btn.innerText = "XÓA NGAY";
        btn.disabled = false;
    }
}